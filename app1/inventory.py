from decimal import Decimal
from django.db import transaction as db_transaction

from .models import InventoryTransaction, Sale, CashFlow, Expense, Product, Handbag, Clothes


class InsufficientStockError(Exception):
    pass


def _attach_item(record, item):
    if isinstance(item, Product):
        record.product = item
    elif isinstance(item, Handbag):
        record.handbag = item
    elif isinstance(item, Clothes):
        record.clothes = item
    else:
        raise ValueError(f"Unsupported item type: {type(item)}")


def add_stock(item, quantity, unit_cost, actor, notes='', new_price=None):
    with db_transaction.atomic():
        if new_price is not None:
            item.price = new_price
        item.stock_quantity += quantity
        item.save()

        tx = InventoryTransaction(
            transaction_type='IN',
            quantity=quantity,
            unit_cost=unit_cost,
            notes=notes,
            created_by=actor,
        )
        _attach_item(tx, item)
        tx._skip_stock_adjustment = True
        tx.save()

        Expense.objects.create(
            description=f'Stock purchase: {item.name} (Qty: {quantity})',
            amount=Decimal(str(quantity)) * Decimal(str(unit_cost)),
            category='Stock Purchase',
            created_by=actor,
        )
        return tx


def record_sale(item, quantity, unit_price, actor, customer_name='', customer_phone=''):
    with db_transaction.atomic():
        item.refresh_from_db()
        if item.stock_quantity < quantity:
            raise InsufficientStockError(
                f'Insufficient stock for {item.name}. '
                f'Available: {item.stock_quantity}, requested: {quantity}'
            )

        item.stock_quantity -= quantity
        item.save()

        sale = Sale(
            quantity=quantity,
            unit_price=unit_price,
            total_amount=Decimal(str(quantity)) * Decimal(str(unit_price)),
            customer_name=customer_name,
            customer_phone=customer_phone,
            created_by=actor,
        )
        _attach_item(sale, item)
        sale._skip_stock_adjustment = True
        sale.save()

        CashFlow.objects.create(
            transaction_type='REVENUE',
            amount=sale.total_amount,
            description=f'Sale: {item.name} x{quantity}',
            reference_sale=sale,
            created_by=actor,
        )
        return sale
