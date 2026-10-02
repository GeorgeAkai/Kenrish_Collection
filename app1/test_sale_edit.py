from decimal import Decimal
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase

from .inventory import InsufficientStockError, edit_sale, record_sale
from .models import CashFlow, Customer, Product, SaleEdit


def make_product(stock=10):
    return Product.objects.create(
        name='Serum', description='d', price=Decimal('500.00'), image='',
        stock_quantity=stock, cost_price=Decimal('300.00'), reorder_level=2,
    )


class EditSaleTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass')
        self.editor = User.objects.create_user(username='editor', password='pass')
        self.product = make_product(stock=10)
        self.sale = record_sale(self.product, 3, Decimal('500'), self.admin,
                                customer_name='Mary', customer_phone='0712345678')  # stock 10 -> 7

    def stock(self):
        self.product.refresh_from_db()
        return self.product.stock_quantity

    def test_raising_quantity_reduces_stock_by_the_difference(self):
        edit_sale(self.sale, self.editor, quantity=5)
        self.assertEqual(self.stock(), 5)

    def test_lowering_quantity_returns_stock(self):
        edit_sale(self.sale, self.editor, quantity=1)
        self.assertEqual(self.stock(), 9)

    def test_raising_quantity_beyond_stock_is_rejected_and_changes_nothing(self):
        with self.assertRaises(InsufficientStockError):
            edit_sale(self.sale, self.editor, quantity=20)  # only 7 left, needs 17 more
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.quantity, 3)
        self.assertEqual(self.stock(), 7)
        self.assertEqual(SaleEdit.objects.count(), 0)

    def test_price_and_quantity_edits_update_the_single_revenue_cashflow(self):
        edit_sale(self.sale, self.editor, quantity=4, unit_price=Decimal('450'))
        flow = CashFlow.objects.get(reference_sale=self.sale)
        self.assertEqual(flow.amount, Decimal('1800.00'))
        self.assertIn('x4', flow.description)
        self.assertEqual(CashFlow.objects.filter(transaction_type='REVENUE').count(), 1)
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.total_amount, Decimal('1800.00'))

    def test_changing_customer_phone_relinks_and_clearing_it_makes_sale_anonymous(self):
        original = self.sale.customer
        edit_sale(self.sale, self.editor, customer_name='Mary W', customer_phone='0799000111')
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.customer_name, 'Mary W')
        self.assertEqual(self.sale.customer.phone, '+254799000111')
        self.assertNotEqual(self.sale.customer_id, original.id)

        edit_sale(self.sale, self.editor, customer_phone='')
        self.sale.refresh_from_db()
        self.assertIsNone(self.sale.customer)

    def test_each_edit_writes_a_permanent_audit_row_with_before_and_after(self):
        edit_sale(self.sale, self.editor, quantity=4, unit_price=Decimal('450'))
        audit = SaleEdit.objects.get()
        self.assertEqual(audit.editor, self.editor)
        self.assertEqual(audit.editor_username, 'editor')
        self.assertEqual(audit.sale_ref, self.sale.id)
        self.assertEqual(audit.item_name, 'Serum')
        self.assertEqual(audit.before, {'quantity': 3, 'unit_price': '500.00',
                                        'customer_name': 'Mary', 'customer_phone': '0712345678'})
        self.assertEqual(audit.after, {'quantity': 4, 'unit_price': '450.00',
                                       'customer_name': 'Mary', 'customer_phone': '0712345678'})

    def test_edit_with_no_changes_writes_no_audit_row(self):
        edit_sale(self.sale, self.editor, quantity=3, unit_price=Decimal('500'), customer_name='Mary')
        self.assertEqual(SaleEdit.objects.count(), 0)

    def test_audit_row_survives_deleting_the_sale_and_the_editor(self):
        edit_sale(self.sale, self.editor, quantity=4)
        sale_id = self.sale.id
        self.sale.delete()
        self.editor.delete()
        audit = SaleEdit.objects.get()
        self.assertEqual(audit.sale_ref, sale_id)
        self.assertEqual(audit.editor_username, 'editor')

    def test_failure_midway_rolls_back_stock_sale_and_cashflow(self):
        with mock.patch('app1.inventory.SaleEdit.objects.create', side_effect=RuntimeError('boom')):
            with self.assertRaises(RuntimeError):
                edit_sale(self.sale, self.editor, quantity=5, unit_price=Decimal('100'))
        self.sale.refresh_from_db()
        self.assertEqual((self.sale.quantity, self.sale.unit_price), (3, Decimal('500.00')))
        self.assertEqual(self.stock(), 7)
        self.assertEqual(CashFlow.objects.get(reference_sale=self.sale).amount, Decimal('1500.00'))
