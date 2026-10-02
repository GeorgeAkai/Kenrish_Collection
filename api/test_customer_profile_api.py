from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from app1.customers import confirm_customer_link
from app1.inventory import record_sale
from app1.models import (
    AuditEntry, Clothes, Customer, Order, OrderItem, Product, Rating, Reservation, Sale, ServiceSale, Wishlist,
)


class CustomerProfileAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.serum = Product.objects.create(name='Serum', description='d', price=Decimal('500'), image='',
                                            stock_quantity=50, cost_price=Decimal('200'), reorder_level=2)
        self.jacket = Clothes.objects.create(name='Jacket', description='d', price=Decimal('800'),
                                             stock_quantity=50, cost_price=Decimal('300'))
        # Mary: walk-in, 1000 product (2 serums) + 1500 service
        self.mary_sale = record_sale(self.serum, 2, Decimal('500'), self.admin, customer_name='Mary', customer_phone='0712111111')
        self.mary = self.mary_sale.customer
        self.mary_service = ServiceSale.objects.create(service_name='Braids', amount=Decimal('1500'), customer_name='Mary',
                                                       customer_phone='0712111111', created_by=self.admin)

    def _profile(self, ref):
        r = self.client.get(f'/api/admin/customers/{ref}/')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_a_walk_ins_profile_has_metrics_and_a_timeline_of_what_they_bought(self):
        p = self._profile(f'customer/{self.mary.id}')
        self.assertEqual((p['kind'], p['name'], p['phone']), ('walkin', 'Mary', '+254712111111'))
        self.assertEqual(p['metrics']['total_spend'], '2500.00')
        self.assertEqual(p['metrics']['purchases'], 2)
        self.assertEqual(p['metrics']['last_purchase'], str(timezone.localdate()))
        self.assertEqual(p['metrics']['average_purchase'], '1250.00')
        kinds = {t['type'] for t in p['timeline']}
        self.assertEqual(kinds, {'sale', 'service'})
        titles = {t['title'] for t in p['timeline']}
        self.assertEqual(titles, {'Serum × 2', 'Braids'})
        self.assertEqual({t['amount'] for t in p['timeline']}, {'1000.00', '1500.00'})
        self.assertIsNone(p['wishlist'])          # walk-ins have no account
        self.assertIsNone(p['metrics']['logins'])

    def test_the_timeline_is_newest_first(self):
        old = timezone.now() - timedelta(days=40)
        Sale.objects.filter(pk=self.mary_sale.pk).update(created_at=old)
        p = self._profile(f'customer/{self.mary.id}')
        self.assertEqual([t['type'] for t in p['timeline']], ['service', 'sale'])

    def test_monthly_spend_covers_the_last_twelve_months_including_empty_ones(self):
        Sale.objects.filter(pk=self.mary_sale.pk).update(created_at=timezone.now() - timedelta(days=65))
        p = self._profile(f'customer/{self.mary.id}')
        months = p['spend_by_month']
        self.assertEqual(len(months), 12)
        self.assertEqual(months[-1]['month'], timezone.localdate().strftime('%Y-%m'))
        self.assertEqual(months[-1]['spend'], '1500.00')                   # the service, this month
        self.assertEqual(sum(Decimal(m['spend']) for m in months), Decimal('2500.00'))
        self.assertTrue(any(m['spend'] == '0.00' for m in months))

    def test_a_registered_customers_profile_merges_orders_reservations_ratings_logins_and_wishlist(self):
        jane = User.objects.create_user(username='jane', password='pass', email='jane@example.com', first_name='Jane')
        jane.userprofile.login_count = 7
        jane.userprofile.save()
        jane.last_login = timezone.now() - timedelta(days=2)
        jane.save()
        sale = record_sale(self.jacket, 1, Decimal('3000'), self.admin, customer_name='Jane', customer_phone='0733222222')
        confirm_customer_link(sale.customer, jane)
        order = Order.objects.create(customer=jane, total_amount=Decimal('800'), status='PENDING')
        OrderItem.objects.create(order=order, item_type='clothes', item_name='Jacket', quantity=1,
                                 unit_price=Decimal('800'), subtotal=Decimal('800'), clothes=self.jacket)
        Reservation.objects.create(customer=jane, reservation_date=timezone.localdate(), reservation_time='10:00', status='APPROVED')
        Rating.objects.create(product=self.serum, user=jane, value=5)
        wl = Wishlist.objects.create(user=jane)
        wl.clothes.add(self.jacket)
        wl.products.add(self.serum)

        p = self._profile(f'customer/{sale.customer.id}')
        self.assertEqual(p['kind'], 'registered')
        self.assertEqual((p['username'], p['email']), ('jane', 'jane@example.com'))
        self.assertEqual(p['metrics']['logins'], 7)
        self.assertIsNotNone(p['metrics']['last_seen'])
        self.assertEqual({t['type'] for t in p['timeline']}, {'sale', 'order', 'reservation', 'rating'})
        self.assertEqual(p['metrics']['total_spend'], '3000.00')           # online orders are activity, not recorded spend
        self.assertEqual({(w['type'], w['name']) for w in p['wishlist']}, {('clothes', 'Jacket'), ('product', 'Serum')})
        # the same person is reachable by their user ref
        self.assertEqual(self._profile(f'user/{jane.id}')['metrics']['total_spend'], '3000.00')

    def test_a_registered_user_who_never_bought_still_has_a_profile(self):
        bob = User.objects.create_user(username='bob', password='pass')
        p = self._profile(f'user/{bob.id}')
        self.assertEqual((p['kind'], p['username']), ('registered', 'bob'))
        self.assertEqual(p['metrics']['total_spend'], '0.00')
        self.assertEqual(p['metrics']['purchases'], 0)
        self.assertIsNone(p['metrics']['last_purchase'])
        self.assertEqual(p['timeline'], [])
        self.assertEqual(p['wishlist'], [])

    def test_unknown_customers_and_kinds_are_404(self):
        for ref in ('customer/99999', 'user/99999', 'stranger/1'):
            self.assertEqual(self.client.get(f'/api/admin/customers/{ref}/').status_code, 404, ref)
        self.assertEqual(self.client.get(f'/api/admin/customers/user/{self.admin.id}/').status_code, 404)  # staff are not customers

    def test_only_admins_can_open_a_profile(self):
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='member', password='pass'))
        self.assertEqual(other.get(f'/api/admin/customers/customer/{self.mary.id}/').status_code, 403)

    # --- editing contact details -------------------------------------------------------------------------
    def test_admin_can_correct_a_customers_name_and_phone_and_it_is_audited(self):
        r = self.client.patch(f'/api/admin/customers/customer/{self.mary.id}/', {'name': 'Mary Wanjiku', 'phone': '0799 000 111'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.mary.refresh_from_db()
        self.assertEqual((self.mary.name, self.mary.phone), ('Mary Wanjiku', '+254799000111'))
        entry = AuditEntry.objects.get(kind='customer', action='edit')
        self.assertEqual((entry.before['phone'], entry.after['phone']), ('+254712111111', '+254799000111'))
        self.assertEqual((entry.before['name'], entry.after['name']), ('Mary', 'Mary Wanjiku'))
        # the history is intact: her sales are still hers
        self.assertEqual(self.mary.sales.count(), 1)

    def test_a_phone_that_belongs_to_someone_else_is_refused(self):
        other = record_sale(self.serum, 1, Decimal('500'), self.admin, customer_name='Zawadi', customer_phone='0722333444').customer
        r = self.client.patch(f'/api/admin/customers/customer/{self.mary.id}/', {'phone': '0722333444'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('already', str(r.json()).lower())
        self.mary.refresh_from_db()
        self.assertEqual(self.mary.phone, '+254712111111')
        self.assertEqual(other.phone, '+254722333444')

    def test_invalid_contact_edits_are_rejected_and_no_change_writes_no_audit(self):
        url = f'/api/admin/customers/customer/{self.mary.id}/'
        self.assertEqual(self.client.patch(url, {'phone': '12345'}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(url, {'phone': ''}, format='json').status_code, 400)   # the phone is what identifies them
        self.assertEqual(self.client.patch(url, {'name': 'Mary'}, format='json').status_code, 200)
        self.assertEqual(AuditEntry.objects.count(), 0)

    def test_only_customers_with_a_record_can_be_edited_and_only_by_admins(self):
        bob = User.objects.create_user(username='bob', password='pass')
        self.assertEqual(self.client.patch(f'/api/admin/customers/user/{bob.id}/', {'name': 'x'}, format='json').status_code, 400)
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='member', password='pass'))
        self.assertEqual(other.patch(f'/api/admin/customers/customer/{self.mary.id}/', {'name': 'x'}, format='json').status_code, 403)

    def test_registered_profiles_show_login_detail_and_when_detailed_tracking_began(self):
        from app1.models import LoginEvent
        jane = User.objects.create_user(username='jane', password='pass')
        jane.userprofile.login_count = 9           # lifetime total, including logins from before events were kept
        jane.userprofile.save()
        old = LoginEvent.objects.create(user=jane, source='web')
        LoginEvent.objects.create(user=jane, source='web')
        LoginEvent.objects.create(user=jane, source='app')
        LoginEvent.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=40))

        p = self._profile(f'user/{jane.id}')
        self.assertEqual(p['metrics']['logins'], 9)
        stats = p['login_stats']
        self.assertEqual((stats['last_30_days'], stats['web'], stats['app']), (2, 2, 1))
        self.assertEqual(stats['tracked_since'], str((timezone.now() - timedelta(days=40)).astimezone(timezone.get_current_timezone()).date()))

    def test_login_detail_is_absent_for_walk_ins_and_for_a_system_with_no_events_yet(self):
        self.assertIsNone(self._profile(f'customer/{self.mary.id}')['login_stats'])
        bob = User.objects.create_user(username='bob', password='pass')
        stats = self._profile(f'user/{bob.id}')['login_stats']
        self.assertEqual((stats['last_30_days'], stats['web'], stats['app'], stats['tracked_since']), (0, 0, 0, None))
