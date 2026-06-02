from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User

from .models import Product, InventoryTransaction, Sale, CashFlow, Expense
from .inventory import add_stock, record_sale, InsufficientStockError


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


class RecordSaleTest(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(username='admin', password='pass')
        self.product = make_product(stock=10)

    # --- Cycle 4: stock decrement ---
    def test_record_sale_decrements_stock_by_exactly_quantity(self):
        record_sale(self.product, quantity=3, unit_price=Decimal('500.00'), actor=self.actor)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 7)

    # --- Cycle 5: creates Sale and CashFlow ---
    def test_record_sale_creates_sale_and_cashflow(self):
        record_sale(self.product, quantity=3, unit_price=Decimal('500.00'), actor=self.actor)
        sales = Sale.objects.filter(product=self.product)
        self.assertEqual(sales.count(), 1)
        self.assertEqual(sales.first().total_amount, Decimal('1500.00'))

        flows = CashFlow.objects.filter(transaction_type='REVENUE')
        self.assertEqual(flows.count(), 1)
        self.assertEqual(flows.first().amount, Decimal('1500.00'))

    # --- Cycle 6: insufficient stock raises and leaves stock unchanged ---
    def test_record_sale_raises_on_insufficient_stock(self):
        with self.assertRaises(InsufficientStockError):
            record_sale(self.product, quantity=99, unit_price=Decimal('500.00'), actor=self.actor)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
        self.assertEqual(Sale.objects.count(), 0)
        self.assertEqual(CashFlow.objects.count(), 0)


class AddStockAtomicTest(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(username='admin', password='pass')
        self.product = make_product()

    # --- Cycle 7: atomicity ---
    def test_add_stock_rolls_back_on_failure(self):
        original_expense_create = Expense.objects.create

        def failing_expense_create(**kwargs):
            raise RuntimeError('DB down')

        Expense.objects.create = failing_expense_create
        try:
            with self.assertRaises(RuntimeError):
                add_stock(self.product, quantity=5, unit_cost=Decimal('300.00'), actor=self.actor)
        finally:
            Expense.objects.create = original_expense_create

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 10)
        self.assertEqual(InventoryTransaction.objects.count(), 0)


class AddStockTest(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(username='admin', password='pass')
        self.product = make_product()

    # --- Cycle 1: stock increment ---
    def test_add_stock_increments_stock_by_exactly_quantity(self):
        add_stock(self.product, quantity=5, unit_cost=Decimal('300.00'), actor=self.actor)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 15)

    # --- Cycle 2: creates one InventoryTransaction ---
    def test_add_stock_creates_one_inventory_transaction(self):
        add_stock(self.product, quantity=5, unit_cost=Decimal('300.00'), actor=self.actor)
        txs = InventoryTransaction.objects.filter(product=self.product)
        self.assertEqual(txs.count(), 1)
        self.assertEqual(txs.first().transaction_type, 'IN')
        self.assertEqual(txs.first().quantity, 5)

    # --- Cycle 3: creates Expense record ---
    def test_add_stock_creates_expense_record(self):
        add_stock(self.product, quantity=5, unit_cost=Decimal('300.00'), actor=self.actor)
        expenses = Expense.objects.all()
        self.assertEqual(expenses.count(), 1)
        self.assertEqual(expenses.first().amount, Decimal('1500.00'))
        self.assertEqual(expenses.first().category, 'Stock Purchase')
