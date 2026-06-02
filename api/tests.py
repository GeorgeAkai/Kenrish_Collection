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

    # --- Cycle C1-1: add_stock is atomic — Expense failure must not leave stock changed ---
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

    # --- Cycle C1-2: record_sale is atomic — CashFlow failure must not leave stock decremented ---
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
