from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from app1.inventory import record_sale
from app1.models import ActivityLog, Product, SaleEdit


class SaleEditAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.product = Product.objects.create(
            name='Serum', description='d', price=Decimal('500'), image='',
            stock_quantity=10, cost_price=Decimal('300'), reorder_level=2,
        )
        self.sale = record_sale(self.product, 3, Decimal('500'), self.admin, customer_phone='0712345678')
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.url = f'/api/admin/inventory/sales/{self.sale.id}/'

    def test_admin_can_patch_quantity_and_price_and_response_shows_the_edit(self):
        r = self.client.patch(self.url, {'quantity': 4, 'unit_price': '450'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['total_amount'], '1800.00')
        self.assertTrue(r.json()['edited'])
        self.assertEqual(r.json()['edit_count'], 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 6)

    def test_non_admin_cannot_edit(self):
        member = User.objects.create_user(username='member', password='pass')
        client = APIClient()
        client.force_authenticate(member)
        self.assertEqual(client.patch(self.url, {'quantity': 4}, format='json').status_code, 403)
        client = APIClient()
        self.assertIn(client.patch(self.url, {'quantity': 4}, format='json').status_code, (401, 403))
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.quantity, 3)

    def test_item_cannot_be_changed(self):
        other = Product.objects.create(name='Other', description='d', price=Decimal('1'), image='',
                                       stock_quantity=5, cost_price=Decimal('1'), reorder_level=1)
        for payload in ({'item_id': other.id}, {'item_type': 'handbag'}, {'product': other.id}):
            r = self.client.patch(self.url, dict(payload, quantity=4), format='json')
            self.assertEqual(r.status_code, 400, payload)
        self.sale.refresh_from_db()
        self.assertEqual((self.sale.quantity, self.sale.product_id), (3, self.product.id))
        self.assertEqual(SaleEdit.objects.count(), 0)

    def test_insufficient_stock_returns_400_and_changes_nothing(self):
        r = self.client.patch(self.url, {'quantity': 50}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('Insufficient stock', r.json()['detail'])
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 7)

    def test_invalid_values_are_rejected(self):
        for payload in ({'quantity': 0}, {'quantity': -2}, {'quantity': 'abc'}, {'unit_price': '-5'}, {'unit_price': 'x'}):
            self.assertEqual(self.client.patch(self.url, payload, format='json').status_code, 400, payload)
        self.assertEqual(SaleEdit.objects.count(), 0)

    def test_missing_sale_is_404(self):
        self.assertEqual(self.client.patch('/api/admin/inventory/sales/99999/', {'quantity': 1}, format='json').status_code, 404)

    def test_edit_shows_in_activity_log_with_a_readable_label(self):
        # The activity middleware identifies users from the JWT header, so use a real token here.
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(self.admin).access_token}')
        client.patch(self.url, {'quantity': 4}, format='json')
        self.assertTrue(ActivityLog.objects.filter(event='action', detail='Edited a sale').exists())

    def test_edit_history_lists_who_changed_what_newest_first(self):
        self.client.patch(self.url, {'quantity': 4}, format='json')
        self.client.patch(self.url, {'unit_price': '450'}, format='json')
        r = self.client.get(self.url + 'edits/')
        self.assertEqual(r.status_code, 200)
        rows = r.json()
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['after']['unit_price'], '450.00')   # newest first
        self.assertEqual(rows[1]['before']['quantity'], 3)
        self.assertEqual(rows[1]['editor_username'], 'admin')
        self.assertIn('created_at', rows[0])

    def test_edit_history_is_admin_only(self):
        member = User.objects.create_user(username='member', password='pass')
        client = APIClient()
        client.force_authenticate(member)
        self.assertEqual(client.get(self.url + 'edits/').status_code, 403)
