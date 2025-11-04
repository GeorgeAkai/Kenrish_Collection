from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta

from .models import (
    Product,
    Handbag,
    Clothes,               # ✅ include Clothes in inventory views
    Sale,
    InventoryTransaction,
    Expense,
)
from django.contrib.auth.models import User


def is_admin(user):
    return user.is_staff or user.is_superuser


@login_required
@user_passes_test(is_admin)
def inventory_dashboard(request):
    """Main inventory dashboard with analytics (Products, Handbags, Clothes)"""

    # Get all items with inventory
    products = Product.objects.all()
    handbags = Handbag.objects.all()
    clothes = Clothes.objects.all()

    # Analytics
    total_products = products.count() + handbags.count() + clothes.count()
    total_inventory_value = (
        sum(p.inventory_value for p in products)
        + sum(h.inventory_value for h in handbags)
        + sum(c.inventory_value for c in clothes)
    )
    low_stock_items = (
        [p for p in products if p.is_low_stock]
        + [h for h in handbags if h.is_low_stock]
        + [c for c in clothes if c.is_low_stock]
    )

    # Recent transactions & sales (now include clothes)
    recent_transactions = (
        InventoryTransaction.objects
        .select_related('product', 'handbag', 'clothes', 'created_by')
        .order_by('-created_at')[:10]
    )

    recent_sales = (
        Sale.objects
        .select_related('product', 'handbag', 'clothes', 'created_by')
        .order_by('-created_at')[:10]
    )

    # Sales analytics
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    today_sales = Sale.objects.filter(created_at__date=today).aggregate(
        total=Sum('total_amount'), count=Sum('quantity')
    )
    week_sales = Sale.objects.filter(created_at__date__gte=week_ago).aggregate(
        total=Sum('total_amount'), count=Sum('quantity')
    )
    month_sales = Sale.objects.filter(created_at__date__gte=month_ago).aggregate(
        total=Sum('total_amount'), count=Sum('quantity')
    )

    context = {
        'products': products,
        'handbags': handbags,
        'clothes': clothes,  # ✅
        'total_products': total_products,
        'total_inventory_value': total_inventory_value,
        'low_stock_count': len(low_stock_items),
        'low_stock_items': low_stock_items,
        'recent_transactions': recent_transactions,
        'recent_sales': recent_sales,
        'today_sales': today_sales,
        'week_sales': week_sales,
        'month_sales': month_sales,
    }
    return render(request, 'inventory/dashboard.html', context)


@login_required
@user_passes_test(is_admin)
def inventory_list(request):
    """List all inventory items (Products, Handbags, Clothes)"""
    products = Product.objects.all()
    handbags = Handbag.objects.all()
    clothes = Clothes.objects.all()

    context = {
        'products': products,
        'handbags': handbags,
        'clothes': clothes,  # ✅
    }
    return render(request, 'inventory/inventory_list.html', context)


@login_required
@user_passes_test(is_admin)
def add_stock(request):
    """Add stock to products/handbags/clothes"""
    if request.method == 'POST':
        item_type = request.POST.get('item_type')          # 'product' | 'handbag' | 'clothes'
        item_id = request.POST.get('item_id')
        quantity = int(request.POST.get('quantity'))
        total_cost = float(request.POST.get('total_cost', 0))
        new_price = request.POST.get('new_price')
        if new_price:
            new_price = float(new_price)
        notes = request.POST.get('notes', '')

        # Resolve item by type
        if item_type == 'product':
            item = get_object_or_404(Product, id=item_id)
        elif item_type == 'handbag':
            item = get_object_or_404(Handbag, id=item_id)
        elif item_type == 'clothes':
            item = get_object_or_404(Clothes, id=item_id)
        else:
            messages.error(request, 'Invalid item type.')
            return redirect('add-stock')

        # Update selling price if provided
        if new_price:
            item.price = new_price
            item.save()

        # Update stock locally (InventoryTransaction also adjusts as a safety net)
        item.stock_quantity += quantity
        item.save()

        # Create transaction (use 'IN' to match model choices)
        InventoryTransaction.objects.create(
            product=item if item_type == 'product' else None,
            handbag=item if item_type == 'handbag' else None,
            clothes=item if item_type == 'clothes' else None,
            transaction_type='IN',  # ✅ was 'STOCK_IN'
            quantity=quantity,
            unit_cost=(total_cost / quantity) if quantity > 0 else 0,
            notes=notes,
            created_by=request.user
        )

        # Create expense record
        Expense.objects.create(
            description=f'Stock purchase: {item.name} (Qty: {quantity})',
            amount=total_cost,
            category='Stock Purchase',
            created_by=request.user
        )

        messages.success(request, f'Added {quantity} units to {item.name}')
        return redirect('inventory-dashboard')

    products = Product.objects.all()
    handbags = Handbag.objects.all()
    clothes = Clothes.objects.all()

    context = {
        'products': products,
        'handbags': handbags,
        'clothes': clothes,  # ✅
        'preselected_type': request.GET.get('item_type'),
        'preselected_id': request.GET.get('item_id'),
    }
    return render(request, 'inventory/add_stock.html', context)


@login_required
@user_passes_test(is_admin)
def record_sale(request):
    """Record a sale (Products, Handbags, Clothes)"""
    if request.method == 'POST':
        item_type = request.POST.get('item_type')  # 'product' | 'handbag' | 'clothes'
        item_id = request.POST.get('item_id')
        quantity = int(request.POST.get('quantity'))
        unit_price = float(request.POST.get('unit_price'))
        # customer_name = request.POST.get('customer_name', '')
        # customer_phone = request.POST.get('customer_phone', '')

        # Resolve item by type
        if item_type == 'product':
            item = get_object_or_404(Product, id=item_id)
        elif item_type == 'handbag':
            item = get_object_or_404(Handbag, id=item_id)
        elif item_type == 'clothes':
            item = get_object_or_404(Clothes, id=item_id)
        else:
            messages.error(request, 'Invalid item type.')
            return redirect('record-sale')

        if item.stock_quantity < quantity:
            messages.error(request, f'Insufficient stock. Available: {item.stock_quantity}')
            return redirect('record-sale')

        # Create sale
        sale = Sale.objects.create(
            product=item if item_type == 'product' else None,
            handbag=item if item_type == 'handbag' else None,
            clothes=item if item_type == 'clothes' else None,
            quantity=quantity,
            unit_price=unit_price,
            # customer_name=customer_name,
            # customer_phone=customer_phone,
            created_by=request.user
        )

        # Update stock (Sale.save also adjusts, but keep here to reflect immediately in UI)
        item.stock_quantity -= quantity
        item.save()

        # Create matching inventory transaction
        # Use unit_cost as COST of goods, not selling price (use item's cost_price).
        InventoryTransaction.objects.create(
            product=item if item_type == 'product' else None,
            handbag=item if item_type == 'handbag' else None,
            clothes=item if item_type == 'clothes' else None,
            transaction_type='SALE',
            quantity=quantity,
            unit_cost=getattr(item, 'cost_price', 0),
            # notes=f'Sale to {customer_name or "Customer"}',
            created_by=request.user
        )

        messages.success(request, f'Sale recorded: {item.name} x{quantity}')
        return redirect('inventory-dashboard')

    products = Product.objects.all()
    handbags = Handbag.objects.all()
    clothes = Clothes.objects.all()

    context = {
        'products': products,
        'handbags': handbags,
        'clothes': clothes,  # ✅
    }
    return render(request, 'inventory/record_sale.html', context)


@login_required
@user_passes_test(is_admin)
def sales_history(request):
    """View sales history (includes clothes)"""
    sales = (
        Sale.objects
        .select_related('product', 'handbag', 'clothes', 'created_by')
        .order_by('-created_at')
    )

    # Filter by date range if provided
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    if start_date:
        sales = sales.filter(created_at__date__gte=start_date)
    if end_date:
        sales = sales.filter(created_at__date__lte=end_date)

    # Calculate totals
    total_sales = sales.aggregate(
        total_amount=Sum('total_amount'),
        total_quantity=Sum('quantity')
    )

    return render(request, 'inventory/sales_history.html', {
        'sales': sales,
        'total_sales': total_sales,
        'start_date': start_date,
        'end_date': end_date,
    })


@login_required
@user_passes_test(is_admin)
def cash_flow(request):
    """Cash flow management (sales + expenses)"""
    sales = Sale.objects.all().order_by('-created_at')
    expenses = Expense.objects.all().order_by('-created_at')

    # Combine and sort by date
    cash_flows = []
    for sale in sales:
        # pick correct item name among product/handbag/clothes
        if sale.product:
            sale_name = sale.product.name
        elif sale.handbag:
            sale_name = sale.handbag.name
        elif sale.clothes:
            sale_name = sale.clothes.name
        else:
            sale_name = 'Item'

        cash_flows.append({
            'transaction_type': 'REVENUE',
            'description': f'Sale: {sale_name}',
            'amount': sale.total_amount,
            'created_at': sale.created_at,
            'created_by': sale.created_by,
        })

    for expense in expenses:
        cash_flows.append({
            'transaction_type': 'EXPENSE',
            'description': expense.description,
            'amount': expense.amount,
            'created_at': expense.created_at,
            'created_by': expense.created_by,
        })

    cash_flows.sort(key=lambda x: x['created_at'], reverse=True)

    # Totals
    total_revenue = sales.aggregate(total=Sum('total_amount'))['total'] or 0
    total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0
    net_profit = total_revenue - total_expenses

    return render(request, 'inventory/cash_flow.html', {
        'cash_flows': cash_flows,
        'total_revenue': total_revenue,
        'total_expenses': total_expenses,
        'net_profit': net_profit,
    })


@login_required
@user_passes_test(is_admin)
def clear_sales_data(request):
    """Clear all sales & transactions and reset stock for all items"""
    if request.method == 'POST':
        # Clear sales and transactions
        Sale.objects.all().delete()
        InventoryTransaction.objects.all().delete()

        # Reset stock quantities across all item types
        Product.objects.all().update(stock_quantity=0)
        Handbag.objects.all().update(stock_quantity=0)
        Clothes.objects.all().update(stock_quantity=0)  # ✅

        messages.success(request, 'All sales and inventory data has been cleared successfully!')
        return redirect('inventory-dashboard')

    return render(request, 'inventory/clear_data.html')
