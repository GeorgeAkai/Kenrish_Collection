from datetime import timedelta
from decimal import Decimal

from django.db.models import F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from app1.models import Product, Handbag, Clothes, Sale, Expense


def _period_qs(qs, period, date_field='created_at'):
    today = timezone.now().date()
    if period == 'today':
        return qs.filter(**{f'{date_field}__date': today})
    elif period == 'week':
        return qs.filter(**{f'{date_field}__date__gte': today - timedelta(days=7)})
    elif period == 'month':
        return qs.filter(**{f'{date_field}__date__gte': today - timedelta(days=30)})
    return qs


def _shop_filter(qs, shop_slug):
    if shop_slug and shop_slug != 'enterprise':
        return qs.filter(shop__slug=shop_slug)
    return qs


def _product_models_for_shop(shop_slug):
    """Return (model, item_type, filter_kwargs) tuples relevant to a shop."""
    if shop_slug == 'beauty':
        return [(Product, 'product', {'product_id__isnull': False})]
    if shop_slug == 'clothes':
        return [
            (Handbag, 'handbag', {'handbag_id__isnull': False}),
            (Clothes, 'clothes', {'clothes_id__isnull': False}),
        ]
    if shop_slug == 'luxury':
        return []  # pending — no product type assigned yet
    # enterprise: all
    return [
        (Product, 'product', {'product_id__isnull': False}),
        (Handbag, 'handbag', {'handbag_id__isnull': False}),
        (Clothes, 'clothes', {'clothes_id__isnull': False}),
    ]


def _inventory_models_for_shop(shop_slug):
    if shop_slug == 'beauty':
        return [(Product, 'product')]
    if shop_slug == 'clothes':
        return [(Handbag, 'handbag'), (Clothes, 'clothes')]
    if shop_slug == 'luxury':
        return []
    return [(Product, 'product'), (Handbag, 'handbag'), (Clothes, 'clothes')]


def sales_summary(period='month', shop_slug=None):
    sale_qs = _shop_filter(Sale.objects.all(), shop_slug)
    expense_qs = _shop_filter(Expense.objects.all(), shop_slug)
    revenue = _period_qs(sale_qs, period).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
    expenses = _period_qs(expense_qs, period).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    return {
        'revenue': revenue,
        'expenses': expenses,
        'net_profit': float(revenue) - float(expenses),
    }


def top_sellers(period='month', shop_slug=None):
    results = []
    for model, label, filter_kwargs in _product_models_for_shop(shop_slug):
        filter_key = f'{label}_id'
        qs = (
            _shop_filter(_period_qs(Sale.objects.filter(**filter_kwargs), period), shop_slug)
            .values(filter_key)
            .annotate(units_sold=Sum('quantity'))
            .order_by('-units_sold')[:5]
        )
        for row in qs:
            try:
                name = model.objects.get(pk=row[filter_key]).name
            except model.DoesNotExist:
                name = 'Unknown'
            results.append({'name': name, 'type': label, 'units_sold': row['units_sold']})
    results.sort(key=lambda r: r['units_sold'], reverse=True)
    return results


def inventory_alerts(shop_slug=None):
    alerts = []
    for model, label in _inventory_models_for_shop(shop_slug):
        for item in model.objects.filter(stock_quantity__lte=F('reorder_level')):
            alerts.append({'id': item.id, 'name': item.name, 'type': label,
                           'stock_quantity': item.stock_quantity, 'reorder_level': item.reorder_level})
    return alerts


def stock_value(shop_slug=None):
    total = Decimal('0')
    for model, _ in _inventory_models_for_shop(shop_slug):
        for item in model.objects.all():
            total += Decimal(str(item.cost_price)) * item.stock_quantity
    return total


def sales_trend(period='month', shop_slug=None):
    qs = _shop_filter(Sale.objects.all(), shop_slug)
    trend = (
        _period_qs(qs, period)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(revenue=Sum('total_amount'))
        .order_by('day')
    )
    return [{'date': str(t['day']), 'revenue': t['revenue']} for t in trend]


def cash_flow_trend(period='month', shop_slug=None):
    sale_qs = _shop_filter(Sale.objects.all(), shop_slug)
    expense_qs = _shop_filter(Expense.objects.all(), shop_slug)
    sales_by_day = {
        str(r['day']): r['revenue']
        for r in _period_qs(sale_qs, period)
        .annotate(day=TruncDate('created_at')).values('day').annotate(revenue=Sum('total_amount'))
    }
    expenses_by_day = {
        str(r['day']): r['total']
        for r in _period_qs(expense_qs, period)
        .annotate(day=TruncDate('created_at')).values('day').annotate(total=Sum('amount'))
    }
    all_days = sorted(set(list(sales_by_day) + list(expenses_by_day)))
    return [{'date': d, 'revenue': sales_by_day.get(d, 0), 'expenses': expenses_by_day.get(d, 0)} for d in all_days]


def expenses_breakdown(period='month', shop_slug=None):
    qs = _shop_filter(Expense.objects.all(), shop_slug)
    qs = _period_qs(qs, period).values('category').annotate(total=Sum('amount')).order_by('-total')
    return [{'category': r['category'], 'total': r['total']} for r in qs]


def enterprise_summary(period='month'):
    """Side-by-side per-shop summary for the master dashboard."""
    shops = [
        ('beauty', 'Beauty Shop'),
        ('clothes', 'Clothes Shop'),
        ('luxury', 'Luxury Attire'),
    ]
    result = []
    for slug, name in shops:
        s = sales_summary(period=period, shop_slug=slug)
        result.append({
            'shop': slug,
            'name': name,
            'revenue': float(s['revenue']),
            'expenses': float(s['expenses']),
            'net_profit': s['net_profit'],
        })
    return result
