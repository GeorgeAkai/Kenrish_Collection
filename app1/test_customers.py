from decimal import Decimal

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase

from .customers import backfill_sale_customers, confirm_customer_link, normalize_phone
from .inventory import record_sale
from .models import Customer, Product, Sale, ServiceSale


def make_product(name='Test Cream', stock=10):
    return Product.objects.create(
        name=name, description='d', price=Decimal('500.00'), image='',
        stock_quantity=stock, cost_price=Decimal('300.00'), reorder_level=5,
    )


class NormalizePhoneTest(SimpleTestCase):
    def test_local_and_international_forms_normalize_to_same_value(self):
        for raw in ['0712345678', '712345678', '+254712345678', '254 712 345 678', '0712-345-678']:
            self.assertEqual(normalize_phone(raw), '+254712345678', raw)

    def test_blank_or_invalid_input_returns_none(self):
        for raw in [None, '', '   ', 'abc', '12', '07123', '+1 415 555 0100', '07123456789012']:
            self.assertIsNone(normalize_phone(raw), repr(raw))


class ProductSaleCustomerLinkTest(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(username='admin', password='pass')
        self.product = make_product()

    def test_sale_with_phone_creates_walkin_customer_and_links_sale(self):
        sale = record_sale(self.product, 1, Decimal('500'), self.actor,
                           customer_name='Mary', customer_phone='0712345678')
        sale.refresh_from_db()
        self.assertEqual(sale.customer.phone, '+254712345678')
        self.assertEqual(sale.customer.name, 'Mary')
        self.assertFalse(sale.customer.is_in_app)

    def test_same_number_in_different_format_reuses_customer(self):
        a = record_sale(self.product, 1, Decimal('500'), self.actor, customer_name='Mary', customer_phone='0712345678')
        b = record_sale(self.product, 1, Decimal('500'), self.actor, customer_name='Mary W', customer_phone='+254 712 345 678')
        self.assertEqual(a.customer_id, b.customer_id)
        self.assertEqual(Customer.objects.count(), 1)
        self.assertEqual(Customer.objects.get().name, 'Mary')  # first name kept
        self.assertEqual(b.customer_name, 'Mary W')            # each sale keeps its own snapshot

    def test_sale_without_phone_is_anonymous(self):
        sale = record_sale(self.product, 1, Decimal('500'), self.actor, customer_name='Someone')
        self.assertIsNone(sale.customer)
        self.assertEqual(Customer.objects.count(), 0)


class ServiceSaleCustomerLinkTest(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(username='admin', password='pass')

    def test_service_sale_with_phone_links_customer(self):
        sale = ServiceSale.objects.create(service_name='Braids', amount=Decimal('1500'),
                                          customer_name='Jane', customer_phone='0722000111',
                                          created_by=self.actor)
        sale.refresh_from_db()
        self.assertEqual(sale.customer.phone, '+254722000111')
        self.assertFalse(sale.customer.is_in_app)

    def test_service_sale_without_phone_is_anonymous(self):
        sale = ServiceSale.objects.create(service_name='Braids', amount=Decimal('1500'), created_by=self.actor)
        self.assertIsNone(sale.customer)


class ProfilePhoneMatchTest(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(username='admin', password='pass')
        self.product = make_product()
        self.member = User.objects.create_user(username='jane', password='pass')
        profile = self.member.userprofile
        profile.phone = '0733111222'
        profile.save()

    def test_sale_matching_profile_phone_suggests_but_does_not_link_user(self):
        sale = record_sale(self.product, 1, Decimal('500'), self.actor,
                           customer_name='Jane', customer_phone='+254733111222')
        customer = sale.customer
        self.assertIsNone(customer.user)
        self.assertFalse(customer.is_in_app)
        self.assertEqual(customer.possible_user, self.member)

    def test_admin_confirmation_links_customer_to_user(self):
        sale = record_sale(self.product, 1, Decimal('500'), self.actor,
                           customer_name='Jane', customer_phone='0733111222')
        confirm_customer_link(sale.customer, self.member)
        customer = Customer.objects.get(pk=sale.customer_id)
        self.assertEqual(customer.user, self.member)
        self.assertTrue(customer.is_in_app)
        self.assertIsNone(customer.possible_user)

    def test_setting_profile_phone_flags_existing_walkin_as_possible_match(self):
        sale = record_sale(self.product, 1, Decimal('500'), self.actor,
                           customer_name='Peter', customer_phone='0744555666')
        peter = User.objects.create_user(username='peter', password='pass')
        profile = peter.userprofile
        profile.phone = '+254 744 555 666'
        profile.save()
        self.assertEqual(Customer.objects.get(pk=sale.customer_id).possible_user, peter)

    def test_confirming_second_walkin_merges_sales_into_users_existing_customer(self):
        first = record_sale(self.product, 1, Decimal('500'), self.actor, customer_phone='0733111222').customer
        confirm_customer_link(first, self.member)
        other = record_sale(self.product, 2, Decimal('500'), self.actor, customer_phone='0799888777')
        confirm_customer_link(other.customer, self.member)

        other.refresh_from_db()
        self.assertEqual(other.customer_id, first.id)
        self.assertEqual(Customer.objects.count(), 1)
        self.assertEqual(first.sales.count(), 2)


class BackfillTest(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(username='admin', password='pass')
        self.product = make_product()

    def test_backfill_links_old_sales_and_is_idempotent(self):
        old = Sale.objects.create(product=self.product, quantity=1, unit_price=Decimal('500'),
                                  customer_name='Old', customer_phone='0712000999', created_by=self.actor)
        anon = Sale.objects.create(product=self.product, quantity=1, unit_price=Decimal('500'), created_by=self.actor)
        svc = ServiceSale.objects.create(service_name='Nails', amount=Decimal('800'), created_by=self.actor)
        ServiceSale.objects.filter(pk=svc.pk).update(customer_phone='0712000999')  # simulate pre-feature row

        backfill_sale_customers()
        backfill_sale_customers()

        old.refresh_from_db(); anon.refresh_from_db(); svc.refresh_from_db()
        self.assertEqual(old.customer.phone, '+254712000999')
        self.assertEqual(svc.customer_id, old.customer_id)
        self.assertIsNone(anon.customer)
        self.assertEqual(Customer.objects.count(), 1)
