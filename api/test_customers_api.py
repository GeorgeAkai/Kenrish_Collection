from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from app1.customers import confirm_customer_link
from app1.inventory import record_sale
from app1.models import AuditEntry, Clothes, Customer, Product, Sale, ServiceSale


class CustomerListAPITest(TestCase):
    """Top customers by total spend (product + service sales); registered users and walk-ins together."""

    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.serum = Product.objects.create(name='Serum', description='d', price=Decimal('500'), image='',
                                            stock_quantity=50, cost_price=Decimal('200'), reorder_level=2)
        self.jacket = Clothes.objects.create(name='Jacket', description='d', price=Decimal('800'),
                                             stock_quantity=50, cost_price=Decimal('300'))
        # Mary: walk-in, 1000 product + 1500 service = 2500 over 2 purchases (beauty only)
        record_sale(self.serum, 2, Decimal('500'), self.admin, customer_name='Mary', customer_phone='0712111111')
        ServiceSale.objects.create(service_name='Braids', amount=Decimal('1500'), customer_name='Mary',
                                   customer_phone='0712111111', created_by=self.admin)
        # Jane: registered, linked, 3000 clothes in 1 purchase (fashion only)
        self.jane = User.objects.create_user(username='jane', password='pass', first_name='Jane', last_name='Wairimu')
        s = record_sale(self.jacket, 1, Decimal('3000'), self.admin, customer_name='Jane', customer_phone='0733222222')
        confirm_customer_link(s.customer, self.jane)
        # Peter: walk-in, 1600 clothes in 2 purchases
        record_sale(self.jacket, 1, Decimal('800'), self.admin, customer_name='Peter', customer_phone='0744333333')
        record_sale(self.jacket, 1, Decimal('800'), self.admin, customer_name='Peter', customer_phone='0744333333')
        # Bob: registered, never bought anything
        self.bob = User.objects.create_user(username='bob', password='pass')
        # A sale with no phone is anonymous and belongs to nobody
        record_sale(self.serum, 1, Decimal('9999'), self.admin, customer_name='Stranger')

    def _rows(self, **params):
        r = self.client.get('/api/admin/customers/', params)
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def _by_name(self, rows):
        return {r['name']: r for r in rows}

    def test_customers_are_ranked_by_total_spend_then_purchase_count(self):
        rows = self._rows()
        self.assertEqual([r['name'] for r in rows], ['Jane', 'Mary', 'Peter', 'bob'])
        self.assertEqual([r['spend'] for r in rows], ['3000.00', '2500.00', '1600.00', '0.00'])
        self.assertEqual([r['purchases'] for r in rows], [1, 2, 2, 0])

    def test_a_tie_on_spend_goes_to_the_customer_with_more_purchases(self):
        record_sale(self.serum, 1, Decimal('1600'), self.admin, customer_name='Tie', customer_phone='0755444444')
        rows = self._rows()
        names = [r['name'] for r in rows]
        # Peter and Tie both spent 1600; Peter bought twice, Tie once
        self.assertLess(names.index('Peter'), names.index('Tie'))

    def test_rows_say_whether_the_customer_is_registered_or_a_walk_in_and_carry_contact_details(self):
        by = self._by_name(self._rows())
        self.assertEqual(by['Mary']['kind'], 'walkin')
        self.assertEqual(by['Mary']['phone'], '+254712111111')
        self.assertEqual(by['Jane']['kind'], 'registered')
        self.assertEqual(by['Jane']['username'], 'jane')
        self.assertEqual(by['bob']['kind'], 'registered')
        self.assertEqual(by['bob']['purchases'], 0)
        self.assertTrue(by['Mary']['ref'].startswith('customer:'))
        self.assertEqual(by['bob']['ref'], f'user:{self.bob.id}')

    def test_anonymous_sales_and_staff_accounts_are_left_out(self):
        names = {r['name'] for r in self._rows()}
        self.assertNotIn('Stranger', names)
        self.assertNotIn('admin', names)

    def test_last_purchase_is_the_most_recent_sale_or_service(self):
        by = self._by_name(self._rows())
        self.assertEqual(by['Mary']['last_purchase'], str(timezone.localdate()))
        self.assertIsNone(by['bob']['last_purchase'])

    def test_shop_filter_counts_only_that_shops_sales_and_services_belong_to_beauty(self):
        beauty = self._by_name(self._rows(shop='beauty'))
        self.assertEqual((beauty['Mary']['spend'], beauty['Mary']['purchases']), ('2500.00', 2))   # product + service
        self.assertEqual(beauty['Jane']['spend'], '0.00')
        fashion = self._by_name(self._rows(shop='fashion'))
        self.assertEqual(fashion['Mary']['spend'], '0.00')                                          # services are Beauty
        self.assertEqual((fashion['Peter']['spend'], fashion['Jane']['spend']), ('1600.00', '3000.00'))
        self.assertEqual([r['name'] for r in self._rows(shop='fashion')][:2], ['Jane', 'Peter'])

    def test_period_filter_ignores_older_purchases(self):
        old = timezone.now() - timedelta(days=100)
        Sale.objects.filter(customer__name='Peter').update(created_at=old)
        ServiceSale.objects.filter(customer__name='Mary').update(served_at=old)
        self.assertEqual(self._by_name(self._rows(period='all'))['Peter']['spend'], '1600.00')
        thirty = self._by_name(self._rows(period='30d'))
        self.assertEqual(thirty['Peter']['spend'], '0.00')
        self.assertEqual(thirty['Mary']['spend'], '1000.00')     # only the recent product sale
        ninety = self._by_name(self._rows(period='90d'))
        self.assertEqual(ninety['Peter']['spend'], '0.00')
        self.assertEqual(self._by_name(self._rows(period='year'))['Peter']['spend'], '1600.00')

    def test_a_walk_in_whose_number_matches_a_profile_shows_the_possible_match(self):
        peter_user = User.objects.create_user(username='peterk', password='pass')
        profile = peter_user.userprofile
        profile.phone = '0744 333 333'
        profile.save()
        by = self._by_name(self._rows())
        self.assertEqual(by['Peter']['possible_user'], {'id': peter_user.id, 'username': 'peterk'})
        self.assertIsNone(by['Mary']['possible_user'])

    def test_only_admins_can_see_customers(self):
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='member', password='pass'))
        self.assertEqual(other.get('/api/admin/customers/').status_code, 403)
        self.assertEqual(APIClient().get('/api/admin/customers/').status_code, 401)


class LinkCustomerAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.serum = Product.objects.create(name='Serum', description='d', price=Decimal('500'), image='',
                                            stock_quantity=50, cost_price=Decimal('200'), reorder_level=2)
        self.user = User.objects.create_user(username='peterk', password='pass')
        profile = self.user.userprofile
        profile.phone = '0744333333'
        profile.save()
        self.sale = record_sale(self.serum, 1, Decimal('500'), self.admin, customer_name='Peter', customer_phone='0744333333')
        self.customer = self.sale.customer

    def test_admin_confirms_a_possible_match_and_the_walk_in_becomes_the_registered_user(self):
        r = self.client.post(f'/api/admin/customers/{self.customer.id}/link/', {'user_id': self.user.id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.user, self.user)
        entry = AuditEntry.objects.get(kind='customer', action='edit')
        self.assertEqual(entry.actor, self.admin)
        self.assertEqual(entry.before['user'], None)
        self.assertEqual(entry.after['user'], 'peterk')

    def test_linking_folds_a_second_record_into_the_users_existing_customer(self):
        self.client.post(f'/api/admin/customers/{self.customer.id}/link/', {'user_id': self.user.id}, format='json')
        other = record_sale(self.serum, 2, Decimal('500'), self.admin, customer_name='Peter', customer_phone='0799888777').customer
        r = self.client.post(f'/api/admin/customers/{other.id}/link/', {'user_id': self.user.id}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(Customer.objects.count(), 1)
        self.assertEqual(Customer.objects.get().sales.count(), 2)

    def test_linking_needs_a_real_non_staff_user_and_a_real_customer(self):
        url = f'/api/admin/customers/{self.customer.id}/link/'
        self.assertEqual(self.client.post(url, {}, format='json').status_code, 400)
        self.assertEqual(self.client.post(url, {'user_id': 99999}, format='json').status_code, 404)
        self.assertEqual(self.client.post(url, {'user_id': self.admin.id}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/admin/customers/99999/link/', {'user_id': self.user.id}, format='json').status_code, 404)
        self.customer.refresh_from_db()
        self.assertIsNone(self.customer.user)

    def test_only_admins_can_link(self):
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='member', password='pass'))
        self.assertEqual(other.post(f'/api/admin/customers/{self.customer.id}/link/', {'user_id': self.user.id}, format='json').status_code, 403)
