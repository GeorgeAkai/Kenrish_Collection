from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from app1.models import Clothes, Handbag


class PriceRangeAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def _clothes(self, **over):
        data = dict(name='Denim Jacket', description='d', price='800', stock_quantity=5, cost_price='300', is_published='true')
        data.update(over)
        return data

    def test_admin_can_create_clothes_with_a_price_range_and_customers_see_it(self):
        r = self.client.post('/api/admin/clothes/', self._clothes(max_price='1500'), format='multipart')
        self.assertEqual(r.status_code, 201, r.content)
        pk = r.json()['id']
        self.assertEqual(Clothes.objects.get(pk=pk).max_price, Decimal('1500.00'))

        public = APIClient()
        body = public.get('/api/clothes/').json()
        listed = next(i for i in body.get('results', body) if i['id'] == pk)
        self.assertEqual(listed['max_price'], '1500.00')
        self.assertEqual(public.get(f'/api/clothes/{pk}/').json()['max_price'], '1500.00')

    def test_max_below_price_is_rejected_for_clothes_and_handbags(self):
        r = self.client.post('/api/admin/clothes/', self._clothes(max_price='500'), format='multipart')
        self.assertEqual(r.status_code, 400)
        self.assertIn('max_price', r.json())

        bag = Handbag.objects.create(name='Tote', description='d', price=Decimal('2000'), image='')
        r = self.client.patch(f'/api/admin/handbags/{bag.id}/', {'max_price': '1999'}, format='json')
        self.assertEqual(r.status_code, 400)
        bag.refresh_from_db()
        self.assertIsNone(bag.max_price)

    def test_range_can_be_set_on_a_handbag_and_cleared(self):
        bag = Handbag.objects.create(name='Tote', description='d', price=Decimal('2000'), image='')
        r = self.client.patch(f'/api/admin/handbags/{bag.id}/', {'max_price': '3500'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        bag.refresh_from_db()
        self.assertEqual(bag.max_price, Decimal('3500.00'))

        r = self.client.patch(f'/api/admin/handbags/{bag.id}/', {'max_price': None}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        bag.refresh_from_db()
        self.assertIsNone(bag.max_price)

    def test_raising_price_above_an_existing_max_is_rejected(self):
        item = Clothes.objects.create(name='J', description='d', price=Decimal('800'), max_price=Decimal('1500'))
        r = self.client.patch(f'/api/admin/clothes/{item.id}/', {'price': '2000'}, format='json')
        self.assertEqual(r.status_code, 400)


class RangedItemPricingTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.shopper = User.objects.create_user(username='shopper', password='pass')
        self.jacket = Clothes.objects.create(name='Jacket', description='d', price=Decimal('800'),
                                             max_price=Decimal('1500'), stock_quantity=4, cost_price=Decimal('300'))

    def test_online_order_charges_the_item_price_not_a_client_supplied_one(self):
        client = APIClient()
        client.force_authenticate(self.shopper)
        r = client.post('/api/orders/', {'items': [
            {'item_type': 'clothes', 'item_id': self.jacket.id, 'quantity': 2, 'unit_price': '1'},
        ]}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        from app1.models import Order
        order = Order.objects.get()
        self.assertEqual(order.total_amount, Decimal('1600'))          # 2 x the minimum (800), not 2 x 1
        self.assertEqual(order.items.get().unit_price, Decimal('800'))

    def test_admin_inventory_list_exposes_the_range(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        rows = client.get('/api/admin/inventory/').json()
        row = next(r for r in rows if r['item_type'] == 'clothes')
        self.assertEqual((Decimal(str(row['price'])), Decimal(str(row['max_price']))), (Decimal('800'), Decimal('1500')))

    def test_admin_can_sell_outside_the_range(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        for price in ('400', '2500'):  # below the minimum, above the maximum
            r = client.post('/api/admin/inventory/record-sale/', {
                'item_type': 'clothes', 'item_id': self.jacket.id, 'quantity': 1, 'unit_price': price,
            }, format='json')
            self.assertEqual(r.status_code, 201, r.content)
            self.assertEqual(Decimal(r.json()['unit_price']), Decimal(price))
