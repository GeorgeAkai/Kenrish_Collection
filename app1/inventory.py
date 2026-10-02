from decimal import Decimal
from django.db import transaction as db_transaction

from .customers import resolve_customer
from .models import InventoryTransaction, Sale, SaleEdit, CashFlow, Expense, Product, Handbag, Clothes


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
            shop='beauty' if isinstance(item, Product) else 'fashion',
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
            customer=resolve_customer(customer_name, customer_phone),
            created_by=actor,
        )
        _attach_item(sale, item)
        sale._skip_stock_adjustment = True
        sale.save()

        # Product = Beauty (cosmetics); Handbag/Clothes = Fashion.
        CashFlow.objects.create(
            transaction_type='REVENUE',
            shop='beauty' if isinstance(item, Product) else 'fashion',
            amount=sale.total_amount,
            description=f'Sale: {item.name} x{quantity}',
            reference_sale=sale,
            created_by=actor,
        )
        return sale


def _sale_snapshot(sale):
    return {
        'quantity': sale.quantity,
        'unit_price': str(Decimal(sale.unit_price).quantize(Decimal('0.01'))),
        'customer_name': sale.customer_name,
        'customer_phone': sale.customer_phone,
    }


def edit_sale(sale, actor, quantity=None, unit_price=None, customer_name=None, customer_phone=None):
    with db_transaction.atomic():
        item = sale._target_item()
        item.refresh_from_db()
        before = _sale_snapshot(sale)
        if quantity is not None and quantity != sale.quantity:
            delta = quantity - sale.quantity
            if delta > item.stock_quantity:
                raise InsufficientStockError(
                    f'Insufficient stock for {item.name}. '
                    f'Available: {item.stock_quantity}, additional needed: {delta}'
                )
            item.stock_quantity -= delta
            item.save()
            sale.quantity = quantity
        if unit_price is not None:
            sale.unit_price = Decimal(str(unit_price))
        if customer_name is not None:
            sale.customer_name = customer_name
        if customer_phone is not None and customer_phone != sale.customer_phone:
            sale.customer_phone = customer_phone
            sale.customer = resolve_customer(sale.customer_name, customer_phone)
        sale.save()  # recomputes total_amount; not a new sale, so no stock/cashflow side effects
        CashFlow.objects.filter(reference_sale=sale).update(
            amount=sale.total_amount,
            description=f'Sale: {item.name} x{sale.quantity}',
        )
        after = _sale_snapshot(sale)
        if after != before:
            SaleEdit.objects.create(
                sale=sale, sale_ref=sale.pk, item_name=item.name,
                editor=actor, editor_username=actor.username, before=before, after=after,
            )
        return sale
