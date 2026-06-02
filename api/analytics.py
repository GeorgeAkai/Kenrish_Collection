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


def sales_summary(period='month'):
    revenue = _period_qs(Sale.objects.all(), period).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
    expenses = _period_qs(Expense.objects.all(), period).aggregate(total=Sum('amount'))['total'] or Decimal('0')
    return {
        'revenue': revenue,
        'expenses': expenses,
        'net_profit': float(revenue) - float(expenses),
    }


def top_sellers(period='month'):
    results = []
    for filter_key, model, label in [
        ('product_id', Product, 'product'),
        ('handbag_id', Handbag, 'handbag'),
        ('clothes_id', Clothes, 'clothes'),
    ]:
        qs = (
            _period_qs(Sale.objects.filter(**{f'{filter_key}__isnull': False}), period)
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


def inventory_alerts():
    alerts = []
    for model, label in [(Product, 'product'), (Handbag, 'handbag'), (Clothes, 'clothes')]:
        for item in model.objects.filter(stock_quantity__lte=F('reorder_level')):
            alerts.append({'id': item.id, 'name': item.name, 'type': label,
                           'stock_quantity': item.stock_quantity, 'reorder_level': item.reorder_level})
    return alerts


def stock_value():
    total = Decimal('0')
    for model in (Product, Handbag, Clothes):
        for item in model.objects.all():
            total += Decimal(str(item.cost_price)) * item.stock_quantity
    return total


def sales_trend(period='month'):
    trend = (
        _period_qs(Sale.objects.all(), period)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(revenue=Sum('total_amount'))
        .order_by('day')
    )
    return [{'date': str(t['day']), 'revenue': t['revenue']} for t in trend]


def cash_flow_trend(period='month'):
    sales_by_day = {
        str(r['day']): r['revenue']
        for r in _period_qs(Sale.objects.all(), period)
        .annotate(day=TruncDate('created_at')).values('day').annotate(revenue=Sum('total_amount'))
    }
    expenses_by_day = {
        str(r['day']): r['total']
        for r in _period_qs(Expense.objects.all(), period)
        .annotate(day=TruncDate('created_at')).values('day').annotate(total=Sum('amount'))
    }
    all_days = sorted(set(list(sales_by_day) + list(expenses_by_day)))
    return [{'date': d, 'revenue': sales_by_day.get(d, 0), 'expenses': expenses_by_day.get(d, 0)} for d in all_days]


def expenses_breakdown(period='month'):
    qs = _period_qs(Expense.objects.all(), period).values('category').annotate(total=Sum('amount')).order_by('-total')
    return [{'category': r['category'], 'total': r['total']} for r in qs]
