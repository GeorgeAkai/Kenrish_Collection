from datetime import timedelta, timezone as dt_timezone
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from app1.inventory import record_sale
from app1.models import Clothes, Handbag, Product, Sale


class InventorySummaryAPITest(TestCase):
    """The live numbers on the Inventory cards, per shop."""

    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        # Beauty: serum (10 @ cost 200 = 2000), lotion out of stock (0), soap low (3 <= 5 @ cost 50 = 150)
        self.serum = Product.objects.create(name='Serum', description='d', price=Decimal('500'), image='',
                                            stock_quantity=10, cost_price=Decimal('200'), reorder_level=2)
        Product.objects.create(name='Lotion', description='d', price=Decimal('300'), image='',
                               stock_quantity=0, cost_price=Decimal('100'), reorder_level=2)
        Product.objects.create(name='Soap', description='d', price=Decimal('100'), image='',
                               stock_quantity=3, cost_price=Decimal('50'), reorder_level=5)
        # Fashion: jacket (4 @ cost 300 = 1200), handbag (2 @ cost 1000 = 2000, low since reorder 2)
        self.jacket = Clothes.objects.create(name='Jacket', description='d', price=Decimal('800'),
                                             stock_quantity=4, cost_price=Decimal('300'), reorder_level=1)
        Handbag.objects.create(name='Tote', description='d', price=Decimal('3000'), image='',
                               stock_quantity=2, cost_price=Decimal('1000'), reorder_level=2)

    def _summary(self, **params):
        r = self.client.get('/api/admin/inventory/summary/', params)
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_beauty_numbers_cover_only_cosmetics(self):
        s = self._summary(shop='beauty')
        self.assertEqual(s['item_count'], 3)
        self.assertEqual(s['stock_value'], '2150.00')
        self.assertEqual(s['low_stock_count'], 2)        # lotion (0) and soap (3 <= 5)
        self.assertEqual(s['out_of_stock_count'], 1)

    def test_fashion_numbers_cover_clothes_and_handbags(self):
        s = self._summary(shop='fashion')
        self.assertEqual(s['item_count'], 2)
        self.assertEqual(s['stock_value'], '3200.00')
        self.assertEqual(s['low_stock_count'], 1)        # the tote (2 <= 2)
        self.assertEqual(s['out_of_stock_count'], 0)

    def test_without_a_shop_everything_is_counted(self):
        s = self._summary()
        self.assertEqual((s['item_count'], s['stock_value'], s['low_stock_count'], s['out_of_stock_count']),
                         (5, '5350.00', 3, 1))

    def test_todays_sales_are_that_shops_product_sales_in_nairobi_time(self):
        record_sale(self.serum, 2, Decimal('500'), self.admin)          # beauty, today: 1000
        record_sale(self.jacket, 1, Decimal('800'), self.admin)         # fashion, today: 800
        yesterday = record_sale(self.serum, 1, Decimal('500'), self.admin)
        Sale.objects.filter(pk=yesterday.pk).update(created_at=timezone.now() - timedelta(days=1, hours=1))

        beauty = self._summary(shop='beauty')
        self.assertEqual((beauty['today_sales_total'], beauty['today_sales_count']), ('1000.00', 1))
        fashion = self._summary(shop='fashion')
        self.assertEqual((fashion['today_sales_total'], fashion['today_sales_count']), ('800.00', 1))
        both = self._summary()
        self.assertEqual((both['today_sales_total'], both['today_sales_count']), ('1800.00', 2))

    def test_a_sale_just_after_midnight_in_nairobi_counts_as_today(self):
        # 22:30 UTC is 01:30 the next day in Nairobi (UTC+3)
        tz = timezone.get_current_timezone()
        local_midnight = timezone.localtime(timezone.now()).replace(hour=0, minute=30, second=0, microsecond=0)
        sale = record_sale(self.serum, 1, Decimal('500'), self.admin)
        Sale.objects.filter(pk=sale.pk).update(created_at=local_midnight.astimezone(dt_timezone.utc))
        self.assertEqual(self._summary(shop='beauty')['today_sales_count'], 1)
        self.assertEqual(str(tz), 'Africa/Nairobi')

    def test_sales_this_month_counts_the_calendar_month(self):
        record_sale(self.serum, 1, Decimal('500'), self.admin)
        old = record_sale(self.serum, 1, Decimal('500'), self.admin)
        Sale.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=45))
        self.assertEqual(self._summary(shop='beauty')['month_sales_count'], 1)

    def test_an_unknown_shop_means_all_shops_and_only_admins_may_ask(self):
        self.assertEqual(self._summary(shop='warehouse')['item_count'], 5)
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='member', password='pass'))
        self.assertEqual(other.get('/api/admin/inventory/summary/').status_code, 403)
        self.assertEqual(APIClient().get('/api/admin/inventory/summary/').status_code, 401)
