from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from app1.models import Product, Handbag, Clothes, InventoryTransaction, Sale, Expense, CashFlow
from api.analytics import sales_summary, top_sellers, inventory_alerts, stock_value


def make_product(name='Test Cream', stock=10, cost=Decimal('300.00')):
    return Product.objects.create(
        name=name,
        description='A test product',
        price=Decimal('500.00'),
        image='',
        stock_quantity=stock,
        cost_price=cost,
        reorder_level=5,
    )


class AdminInventoryAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.product = make_product(stock=10)
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'admin', 'password': 'pass'},
            content_type='application/json',
        )
        self.token = response.json()['access']

    def _auth(self):
        return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    # --- Cycle C1-1: add_stock is atomic, Expense failure must not leave stock changed ---
    def test_admin_add_stock_rolls_back_on_expense_failure(self):
        original = Expense.objects.create

        def fail_expense(**kwargs):
            raise RuntimeError('forced failure')

        Expense.objects.create = fail_expense
        self.client.raise_request_exception = False
        try:
            self.client.post(
                '/api/admin/inventory/add-stock/',
                {'item_type': 'product', 'item_id': self.product.id, 'quantity': 5, 'unit_cost': '300.00'},
                content_type='application/json',
                **self._auth(),
            )
        finally:
            Expense.objects.create = original
            self.client.raise_request_exception = True

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
        self.assertEqual(InventoryTransaction.objects.count(), 0)

    # --- Cycle C1-2: record_sale is atomic, CashFlow failure must not leave stock decremented ---
    def test_admin_record_sale_rolls_back_on_cashflow_failure(self):
        original = CashFlow.objects.create

        def fail_cashflow(**kwargs):
            raise RuntimeError('forced failure')

        CashFlow.objects.create = fail_cashflow
        self.client.raise_request_exception = False
        try:
            self.client.post(
                '/api/admin/inventory/record-sale/',
                {'item_type': 'product', 'item_id': self.product.id, 'quantity': 3, 'unit_price': '500.00'},
                content_type='application/json',
                **self._auth(),
            )
        finally:
            CashFlow.objects.create = original
            self.client.raise_request_exception = True

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
        self.assertEqual(Sale.objects.count(), 0)


class AnalyticsTest(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.product = make_product(name='Cream', stock=20, cost=Decimal('300.00'))
        self.handbag = Handbag.objects.create(
            name='Clutch', description='test', price=Decimal('800.00'), image='',
            stock_quantity=5, cost_price=Decimal('400.00'), reorder_level=3,
        )

    def _sale(self, item, qty, price):
        from app1.inventory import record_sale
        return record_sale(item, quantity=qty, unit_price=price, actor=self.actor)

    def _expense(self, amount, category='General'):
        return Expense.objects.create(description='test', amount=amount, category=category, created_by=self.actor)

    # --- C5-1: sales_summary returns correct revenue ---
    def test_sales_summary_revenue(self):
        self._sale(self.product, qty=2, price=Decimal('500.00'))
        result = sales_summary(period='month')
        self.assertEqual(result['revenue'], Decimal('1000.00'))

    # --- C5-2: sales_summary returns correct net_profit ---
    def test_sales_summary_net_profit(self):
        self._sale(self.product, qty=2, price=Decimal('500.00'))
        self._expense(Decimal('200.00'))
        result = sales_summary(period='month')
        self.assertAlmostEqual(result['net_profit'], 800.0)

    # --- C5-3: top_sellers ranks by units sold across types ---
    def test_top_sellers_ranks_by_units(self):
        self._sale(self.product, qty=5, price=Decimal('500.00'))
        self._sale(self.handbag, qty=2, price=Decimal('800.00'))
        result = top_sellers(period='month')
        names = [row['name'] for row in result]
        self.assertIn('Cream', names)
        self.assertIn('Clutch', names)
        cream_row = next(r for r in result if r['name'] == 'Cream')
        self.assertEqual(cream_row['units_sold'], 5)

    # --- C5-4: inventory_alerts returns items at or below reorder level ---
    def test_inventory_alerts_returns_low_stock(self):
        self.product.stock_quantity = 3
        self.product.reorder_level = 5
        self.product.save()
        alerts = inventory_alerts()
        ids = [a['id'] for a in alerts if a['type'] == 'product']
        self.assertIn(self.product.id, ids)

    # --- C5-5: stock_value sums cost_price x stock across all types ---
    def test_stock_value_sums_all_types(self):
        # product: 20 × 300 = 6000; handbag: 5 × 400 = 2000
        total = stock_value()
        self.assertEqual(total, Decimal('8000.00'))


class ChatbotPromptTest(TestCase):
    def setUp(self):
        from app1.models import Product, Handbag, Clothes
        self.actor = User.objects.create_user(username='admin', password='pass')
        self.product = Product.objects.create(
            name='Rose Oil', description='test', price=Decimal('350.00'), image='',
            stock_quantity=10, cost_price=Decimal('200.00'), reorder_level=2,
        )

    # --- C3-1: system prompt includes live product name and price ---
    def test_build_system_prompt_includes_product_name_and_price(self):
        from chatbot.ai_service import build_system_prompt
        from app1.models import Product, Handbag, Clothes
        products = list(Product.objects.values('name', 'price', 'stock_quantity'))
        handbags = list(Handbag.objects.values('name', 'price', 'stock_quantity'))
        clothes = list(Clothes.objects.values('name', 'price', 'stock_quantity'))
        prompt = build_system_prompt(products, handbags, clothes)
        self.assertIn('Rose Oil', prompt)
        self.assertIn('350', prompt)

    # --- C3-2: system prompt handles empty catalogue gracefully ---
    def test_build_system_prompt_handles_empty_catalogue(self):
        from chatbot.ai_service import build_system_prompt
        prompt = build_system_prompt([], [], [])
        self.assertIsInstance(prompt, str)
        self.assertGreater(len(prompt), 0)

    # --- C3-3: system prompt includes store info ---
    def test_build_system_prompt_includes_store_info(self):
        from chatbot.ai_service import build_system_prompt
        prompt = build_system_prompt([], [], [])
        self.assertIn('Kenrish', prompt)
        self.assertIn('KES', prompt)


class AuthAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@kenrish.co.ke',
            password='testpass123',
        )

    def _login(self, credential, password='testpass123'):
        return self.client.post(
            '/api/auth/login/',
            {'username': credential, 'password': password},
            content_type='application/json',
        )

    # --- Cycle 1: login with email ---
    def test_login_with_email_returns_tokens(self):
        response = self._login('test@kenrish.co.ke')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    # --- Cycle 2: login with username ---
    def test_login_with_username_returns_tokens(self):
        response = self._login('testuser')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    # --- Cycle 3: bad credentials ---
    def test_login_with_bad_credentials_returns_401(self):
        response = self._login('testuser', password='wrongpassword')
        self.assertEqual(response.status_code, 401)

    # --- Cycle 4: token refresh ---
    def test_token_refresh_returns_new_access_token(self):
        refresh = self._login('testuser').json()['refresh']
        response = self.client.post(
            '/api/auth/token/refresh/',
            {'refresh': refresh},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())

    # --- Cycle 5: register ---
    def test_register_creates_user_and_returns_tokens(self):
        response = self.client.post(
            '/api/auth/register/',
            {'username': 'newuser', 'email': 'new@kenrish.co.ke', 'password': 'newpass123'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.filter(username='newuser').exists())
        self.assertIn('access', response.json())
        self.assertIn('refresh', response.json())

    # --- Cycle 6: me returns is_staff ---
    def test_me_returns_user_with_is_staff(self):
        access = self._login('testuser').json()['access']
        response = self.client.get(
            '/api/auth/me/',
            HTTP_AUTHORIZATION=f'Bearer {access}',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('is_staff', data)
        self.assertEqual(data['email'], 'test@kenrish.co.ke')
        self.assertFalse(data['is_staff'])

    # --- Cycle 7: me without token ---
    def test_me_without_token_returns_401(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)


class FashionShopFeaturesTest(TestCase):
    """Clothes categories, service sales, per-shop analytics and the dashboard reset."""

    def setUp(self):
        from rest_framework.test import APIClient
        self.admin = User.objects.create_user(username='boss', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.product = make_product(name='Cream', stock=10, cost=Decimal('300.00'))
        self.handbag = Handbag.objects.create(
            name='Clutch', description='t', price=Decimal('800'), image='',
            stock_quantity=5, cost_price=Decimal('400'), reorder_level=3,
        )

    # --- categories CRUD ---
    def test_seeded_categories_present(self):
        names = [c['name'] for c in self.client.get('/api/clothes/categories/').json()]
        self.assertEqual(names, ['Men', 'Women', 'Kids'])

    def test_category_crud_and_delete_guard(self):
        r = self.client.post('/api/admin/clothes-categories/', {'name': 'Teens'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['slug'], 'teens')
        cid = r.json()['id']
        self.assertEqual(self.client.post('/api/admin/clothes-categories/', {'name': 'teens'}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(f'/api/admin/clothes-categories/{cid}/', {'name': 'Teenagers'}, format='json').status_code, 200)

        Clothes.objects.create(name='Hoodie', description='t', price=Decimal('900'), category_id=cid)
        self.assertEqual(self.client.delete(f'/api/admin/clothes-categories/{cid}/').status_code, 409)
        Clothes.objects.all().delete()
        self.assertEqual(self.client.delete(f'/api/admin/clothes-categories/{cid}/').status_code, 204)

    def test_clothes_filter_by_category(self):
        from app1.models import ClothesCategory
        men = ClothesCategory.objects.get(slug='men')
        Clothes.objects.create(name='Shirt', description='t', price=Decimal('500'), category=men)
        Clothes.objects.create(name='Dress', description='t', price=Decimal('900'),
                               category=ClothesCategory.objects.get(slug='women'))
        names = [c['name'] for c in self.client.get('/api/clothes/?category=men').json()['results']]
        self.assertEqual(names, ['Shirt'])

    def test_non_admin_cannot_manage_categories(self):
        from rest_framework.test import APIClient
        anon = APIClient()
        self.assertIn(anon.post('/api/admin/clothes-categories/', {'name': 'X'}, format='json').status_code, (401, 403))

    # --- service sales ---
    def test_service_sale_creates_beauty_revenue_and_delete_removes_it(self):
        from app1.models import Service
        svc = Service.objects.create(name='Braids', short_description='s', full_description='f')
        r = self.client.post('/api/admin/service-sales/',
                             {'service': svc.id, 'amount': '1500', 'payment_method': 'mpesa'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['service_name'], 'Braids')
        cf = CashFlow.objects.get(transaction_type='REVENUE', shop='beauty')
        self.assertEqual(cf.amount, Decimal('1500'))

        sid = r.json()['id']
        self.client.patch(f'/api/admin/service-sales/{sid}/', {'amount': '2000'}, format='json')
        self.assertEqual(CashFlow.objects.get(shop='beauty').amount, Decimal('2000'))

        self.assertEqual(self.client.delete(f'/api/admin/service-sales/{sid}/').status_code, 204)
        self.assertFalse(CashFlow.objects.filter(shop='beauty').exists())

    def test_service_sale_validation(self):
        self.assertEqual(self.client.post('/api/admin/service-sales/', {'amount': '100'}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/admin/service-sales/',
                                          {'service_name': 'Cut', 'amount': '0'}, format='json').status_code, 400)

    # --- per-shop analytics ---
    def _seed_money(self):
        from app1.inventory import record_sale, add_stock
        from app1.models import ServiceSale
        record_sale(self.product, 2, Decimal('500'), self.admin)       # beauty 1000
        record_sale(self.handbag, 1, Decimal('800'), self.admin)       # fashion 800
        ServiceSale.objects.create(service_name='Braids', amount=Decimal('1500'), created_by=self.admin)  # beauty 1500
        add_stock(self.product, 10, Decimal('300'), self.admin)        # beauty expense 3000
        add_stock(self.handbag, 2, Decimal('400'), self.admin)         # fashion expense 800

    def test_summary_is_scoped_per_shop_and_combined(self):
        self._seed_money()
        beauty = self.client.get('/api/admin/analytics/summary/?shop=beauty').json()
        fashion = self.client.get('/api/admin/analytics/summary/?shop=fashion').json()
        both = self.client.get('/api/admin/analytics/summary/').json()
        self.assertEqual((float(beauty['revenue']), float(beauty['expenses'])), (2500.0, 3000.0))
        self.assertEqual((float(fashion['revenue']), float(fashion['expenses'])), (800.0, 800.0))
        self.assertEqual((float(both['revenue']), float(both['expenses'])), (3300.0, 3800.0))

    def test_expenses_breakdown_and_income_vs_expenses(self):
        self._seed_money()
        rows = self.client.get('/api/admin/analytics/expenses-breakdown/?shop=beauty').json()
        self.assertEqual([(r['category'], float(r['total'])) for r in rows], [('Stock Purchase', 3000.0)])
        trend = self.client.get('/api/admin/analytics/cash-flow/?period=month').json()
        self.assertEqual(len(trend), 1)
        self.assertEqual((float(trend[0]['revenue']), float(trend[0]['expenses'])), (3300.0, 3800.0))
        yearly = self.client.get('/api/admin/analytics/cash-flow/?period=year').json()
        self.assertRegex(yearly[0]['date'], r'^\d{4}-\d{2}$')

    def test_shop_breakdown_has_no_luxury(self):
        self._seed_money()
        data = self.client.get('/api/admin/analytics/shop-breakdown/').json()
        self.assertEqual(set(data['totals']), {'beauty', 'fashion'})
        self.assertEqual(data['top_shop'], 'beauty')

    def test_top_sellers_beauty_includes_services(self):
        self._seed_money()
        data = self.client.get('/api/admin/analytics/top-sellers/?shop=beauty').json()
        self.assertEqual([s['name'] for s in data['services']], ['Braids'])
        self.assertEqual(data['handbags'], [])

    def test_stock_breakdown_per_shop(self):
        data = self.client.get('/api/admin/analytics/stock-breakdown/?shop=beauty').json()
        self.assertEqual([i['name'] for i in data['items']], ['Cream'])
        item = data['items'][0]
        self.assertEqual((item['units'], float(item['cost_price']), float(item['value'])), (10, 300.0, 3000.0))
        both = self.client.get('/api/admin/analytics/stock-breakdown/').json()
        self.assertEqual(both['total_units'], 15)
        self.assertEqual(float(both['total_value']), 3000.0 + 5 * 400.0)
        self.assertEqual(both['items'][0]['name'], 'Cream')  # largest value first

    def test_transactions_rows_and_totals(self):
        self._seed_money()
        inc = self.client.get('/api/admin/analytics/transactions/?type=income&shop=beauty').json()
        self.assertEqual(float(inc['total']), 2500.0)
        self.assertEqual(sorted(r['category'] for r in inc['rows']), ['Product sale', 'Service'])
        exp = self.client.get('/api/admin/analytics/transactions/?type=expense').json()
        self.assertEqual((exp['count'], float(exp['total'])), (2, 3800.0))
        self.assertEqual({r['shop'] for r in exp['rows']}, {'beauty', 'fashion'})
        self.assertEqual(self.client.get('/api/admin/analytics/transactions/?type=nope').status_code, 400)

    # --- reset ---
    def test_reset_clears_dashboard_data_but_keeps_catalogue_and_stock(self):
        from app1.models import ServiceSale
        self._seed_money()
        stock_before = Product.objects.get(pk=self.product.pk).stock_quantity
        r = self.client.post('/api/admin/analytics/reset/', {'save': True}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['deleted']['service_sales'], 1)
        self.assertIn('snapshot', r.json())
        for model in (Sale, ServiceSale, Expense, CashFlow):
            self.assertEqual(model.objects.count(), 0)
        self.assertEqual(Product.objects.get(pk=self.product.pk).stock_quantity, stock_before)
        summary = self.client.get('/api/admin/analytics/summary/').json()
        self.assertEqual(float(summary['revenue']), 0.0)


class ActivityLogTest(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.APIClient = APIClient
        self.admin = User.objects.create_user(username='boss', password='pass', is_staff=True)
        self.shopper = User.objects.create_user(username='amina', password='pass')
        self.admin_client = APIClient()
        self.admin_client.force_authenticate(self.admin)
        self.product = make_product(name='Cream')

    def _logs(self, **kw):
        from app1.models import ActivityLog
        return ActivityLog.objects.filter(**kw)

    def test_track_records_page_view_and_search_but_not_admin_pages(self):
        c = self.APIClient()
        r = c.post('/api/activity/track/', {'path': '/products?search=shea', 'client_id': 'abc'}, format='json')
        self.assertEqual(r.status_code, 204)
        log = self._logs(event='page_view').get()
        self.assertEqual((log.path, log.detail, log.client_id), ('/products', 'search: shea', 'abc'))
        c.post('/api/activity/track/', {'path': '/admin/users'}, format='json')
        self.assertEqual(self._logs(event='page_view').count(), 1)

    def test_product_detail_logs_a_product_view_with_user(self):
        c = self.APIClient()
        c.force_authenticate(self.shopper)
        c.get(f'/api/products/{self.product.id}/')
        log = self._logs(event='product_view').get()
        self.assertEqual((log.username, log.object_name, log.object_type), ('amina', 'Cream', 'product'))

    def test_login_success_and_failure_are_logged(self):
        c = self.APIClient()
        c.post('/api/auth/login/', {'username': 'amina', 'password': 'wrong'}, format='json')
        c.post('/api/auth/login/', {'username': 'amina', 'password': 'pass'}, format='json')
        self.assertEqual(self._logs(event='login_failed').get().detail, 'tried: amina')
        self.assertEqual(self._logs(event='login').get().username, 'amina')

    def test_middleware_logs_admin_writes_with_label(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = str(RefreshToken.for_user(self.admin).access_token)
        c = self.APIClient()
        c.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        c.post('/api/admin/clothes-categories/', {'name': 'Teens'}, format='json')
        log = self._logs(event='action').get()
        self.assertEqual((log.username, log.method, log.status_code), ('boss', 'POST', 201))
        self.assertEqual(log.detail, 'Admin: created')

    def test_admin_list_stats_and_purge(self):
        from datetime import timedelta
        from django.utils import timezone
        from app1.models import ActivityLog
        c = self.APIClient()
        c.post('/api/activity/track/', {'path': '/', 'client_id': 'v1'}, format='json')
        c.post('/api/activity/track/', {'path': '/', 'client_id': 'v2'}, format='json')
        c.get(f'/api/products/{self.product.id}/')
        old = ActivityLog.objects.create(event='page_view', path='/old')
        ActivityLog.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=200))

        stats = self.admin_client.get('/api/admin/activity/stats/?period=month').json()
        self.assertEqual(stats['totals']['page_views'], 2)
        self.assertEqual(stats['totals']['product_views'], 1)
        self.assertEqual(stats['top_pages'][0], {'path': '/', 'views': 2})
        self.assertEqual(stats['top_products'][0]['name'], 'Cream')
        self.assertEqual(stats['daily'][0]['visitors'], 2)

        listing = self.admin_client.get('/api/admin/activity/?event=product_view').json()
        self.assertEqual(listing['count'], 1)

        self.assertEqual(self.admin_client.delete('/api/admin/activity/purge/?days=90').json(), {'deleted': 1})
        self.assertEqual(self.admin_client.delete('/api/admin/activity/purge/?days=0').status_code, 400)

    def test_non_admin_cannot_read_logs(self):
        c = self.APIClient()
        c.force_authenticate(self.shopper)
        self.assertEqual(c.get('/api/admin/activity/').status_code, 403)
        self.assertIn(self.APIClient().get('/api/admin/activity/stats/').status_code, (401, 403))


class CustomerReviewTest(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.APIClient = APIClient
        self.admin = User.objects.create_user(username='boss', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_admin_crud_and_public_only_sees_published(self):
        body = {'customer_name': 'Amina', 'customer_label': 'Braids client', 'text': 'Loved it!', 'rating': 5}
        r = self.client.post('/api/admin/reviews/', body, format='json')
        self.assertEqual(r.status_code, 201)
        rid = r.json()['id']
        self.client.post('/api/admin/reviews/', {**body, 'customer_name': 'Hidden', 'is_published': False}, format='json')

        public = self.APIClient().get('/api/reviews/').json()
        self.assertEqual([x['customer_name'] for x in public], ['Amina'])

        self.assertEqual(self.client.patch(f'/api/admin/reviews/{rid}/', {'rating': 4}, format='json').json()['rating'], 4)
        self.assertEqual(self.client.delete(f'/api/admin/reviews/{rid}/').status_code, 204)

    def test_validation_and_permissions(self):
        bad = self.client.post('/api/admin/reviews/', {'customer_name': 'A', 'text': 'x', 'rating': 9}, format='json')
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(self.client.post('/api/admin/reviews/', {'customer_name': ' ', 'text': 'x'}, format='json').status_code, 400)
        self.assertIn(self.APIClient().post('/api/admin/reviews/', {}, format='json').status_code, (401, 403))


class PublicSlotsPerServiceTest(TestCase):
    def setUp(self):
        from datetime import date, timedelta
        from app1.models import Service, SlotConfiguration
        self.hair = Service.objects.create(name='Hairdressing', short_description='s', full_description='f')
        self.nails = Service.objects.create(name='Nails', short_description='s', full_description='f')
        SlotConfiguration.objects.create(service=self.hair, slot_duration_minutes=120, worker_count=2, start_time='09:00', end_time='15:00')
        SlotConfiguration.objects.create(service=self.nails, slot_duration_minutes=45, worker_count=1, start_time='09:00', end_time='11:15')
        d = date.today() + timedelta(days=3)
        while d.weekday() == 6:
            d += timedelta(days=1)
        self.day = d.isoformat()

    def test_service_param_returns_that_services_own_blocks(self):
        data = self.client.get(f'/api/reservations/public-slots/?date={self.day}&service={self.hair.id}').json()
        self.assertEqual([s['time'] for s in data], ['09:00', '11:00', '13:00'])
        self.assertEqual({s['duration_minutes'] for s in data}, {120})
        self.assertEqual(data[0]['total_capacity'], 2)

    def test_other_services_bookings_do_not_affect_this_service(self):
        from app1.models import Reservation
        user = User.objects.create_user(username='c', password='p')
        Reservation.objects.create(customer=user, service=self.nails, reservation_date=self.day, reservation_time='09:00', status='APPROVED')
        data = self.client.get(f'/api/reservations/public-slots/?date={self.day}&service={self.hair.id}').json()
        self.assertTrue(data[0]['available'])
        nails = self.client.get(f'/api/reservations/public-slots/?date={self.day}&service={self.nails.id}').json()
        self.assertFalse(nails[0]['available'])
        self.assertEqual([s['time'] for s in nails], ['09:00', '09:45', '10:30'])

    def test_all_services_view_marks_mixed_durations(self):
        data = self.client.get(f'/api/reservations/public-slots/?date={self.day}').json()
        by_time = {s['time']: s for s in data}
        self.assertIsNone(by_time['09:00']['duration_minutes'])     # hair 120 + nails 45
        self.assertEqual(by_time['11:00']['duration_minutes'], 120)  # only hair



class NairobiTimeTest(TestCase):
    """21:30 UTC on 30 Sep is already 00:30 on 1 Oct in Nairobi."""

    def setUp(self):
        from datetime import datetime, timezone as dtz
        from unittest import mock
        self.fake_now = datetime(2026, 9, 30, 21, 30, tzinfo=dtz.utc)
        patcher = mock.patch('django.utils.timezone.now', return_value=self.fake_now)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_today_is_the_nairobi_date(self):
        from django.utils import timezone
        self.assertEqual(str(timezone.localdate()), '2026-10-01')

    def test_public_slots_treat_yesterday_as_past_and_today_as_open(self):
        from app1.models import Service, SlotConfiguration
        svc = Service.objects.create(name='Hair', short_description='s', full_description='f')
        SlotConfiguration.objects.create(service=svc, slot_duration_minutes=60, start_time='00:00', end_time='03:00')
        today = self.client.get('/api/reservations/public-slots/?date=2026-10-01&service=%d' % svc.id).json()
        self.assertEqual([(s['time'], s['past']) for s in today], [('00:00', True), ('01:00', False), ('02:00', False)])
        yesterday = self.client.get('/api/reservations/public-slots/?date=2026-09-30&service=%d' % svc.id).json()
        self.assertTrue(all(s['past'] for s in yesterday))

    def test_sale_after_midnight_nairobi_counts_as_today(self):
        from django.contrib.auth.models import User as U
        from app1.models import ServiceSale
        from api.analytics import sales_summary
        admin = U.objects.create_user(username='a', password='p', is_staff=True)
        ServiceSale.objects.create(service_name='Braids', amount=Decimal('1000'), created_by=admin)
        self.assertEqual(sales_summary('today')['revenue'], Decimal('1000'))
