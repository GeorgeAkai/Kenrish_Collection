from datetime import timedelta
from decimal import Decimal

from django.db.models import F, Q, Sum, Count
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone

from app1.models import (
    Product, Handbag, Clothes, Sale, ServiceSale, Expense, CashFlow, Reservation,
)

PERIOD_DAYS = {'today': 0, 'week': 7, 'month': 30, 'quarter': 90, 'year': 365}
SHOPS = ('beauty', 'fashion')

# Which catalogue models belong to which shop. Product = Beauty (cosmetics);
# Handbag/Clothes = Fashion.
SHOP_MODELS = {
    'beauty': [(Product, 'product')],
    'fashion': [(Handbag, 'handbag'), (Clothes, 'clothes')],
}


def clean_shop(value):
    """Normalise a ?shop= query param: 'beauty' / 'fashion', anything else = all shops."""
    return value if value in SHOPS else None


def _period_qs(qs, period, date_field='created_at'):
    today = timezone.now().date()
    if period == 'today':
        return qs.filter(**{f'{date_field}__date': today})
    # Unrecognized period (previously fell through and returned unfiltered
    # all-time data, silently) now falls back to the 'month' window instead
    # of raising, so a bad query param can't 500 the analytics endpoints.
    days = PERIOD_DAYS.get(period, PERIOD_DAYS['month'])
    return qs.filter(**{f'{date_field}__date__gte': today - timedelta(days=days)})


def _revenue_qs(period, shop=None):
    """Income = CashFlow revenue rows (product sales + service sales).
    Rows predating the `shop` field (NULL) are legacy Fashion sales."""
    qs = _period_qs(CashFlow.objects.filter(transaction_type='REVENUE'), period)
    if shop == 'beauty':
        qs = qs.filter(shop='beauty')
    elif shop == 'fashion':
        qs = qs.filter(Q(shop='fashion') | Q(shop__isnull=True))
    return qs


def _expense_qs(period, shop=None):
    """Expenses with no shop are shared costs: they only appear in the all-shops view."""
    qs = _period_qs(Expense.objects.all(), period)
    return qs.filter(shop=shop) if shop else qs


def _total(qs, field):
    return qs.aggregate(total=Sum(field))['total'] or Decimal('0')


def sales_summary(period='month', shop=None):
    revenue = _total(_revenue_qs(period, shop), 'amount')
    expenses = _total(_expense_qs(period, shop), 'amount')
    return {
        'revenue': revenue,
        'expenses': expenses,
        'net_profit': float(revenue) - float(expenses),
    }


def top_sellers(period='month', shop=None):
    results = []
    models = [m for s in (SHOPS if shop is None else (shop,)) for m in SHOP_MODELS[s]]
    for model, label in models:
        filter_key = f'{label}_id'
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

    if shop in (None, 'beauty'):
        services = (
            _period_qs(ServiceSale.objects.all(), period, 'served_at')
            .values('service_name')
            .annotate(units_sold=Count('id'))
            .order_by('-units_sold')[:5]
        )
        for row in services:
            results.append({'name': row['service_name'], 'type': 'service', 'units_sold': row['units_sold']})

    results.sort(key=lambda r: r['units_sold'], reverse=True)
    return results


def inventory_alerts(shop=None):
    alerts = []
    models = [m for s in (SHOPS if shop is None else (shop,)) for m in SHOP_MODELS[s]]
    for model, label in models:
        for item in model.objects.filter(stock_quantity__lte=F('reorder_level')):
            alerts.append({'id': item.id, 'name': item.name, 'type': label,
                           'stock_quantity': item.stock_quantity, 'reorder_level': item.reorder_level})
    return alerts


def stock_value(shop=None):
    total = Decimal('0')
    models = [m for s in (SHOPS if shop is None else (shop,)) for m in SHOP_MODELS[s]]
    for model, _ in models:
        for item in model.objects.all():
            total += Decimal(str(item.cost_price)) * item.stock_quantity
    return total


TRANSACTION_LIMIT = 500


def transactions(kind, period='month', shop=None):
    """Individual income or expense rows behind the dashboard totals, newest first.
    The total always covers every row; `rows` is capped at TRANSACTION_LIMIT."""
    if kind == 'income':
        qs = _revenue_qs(period, shop).order_by('-created_at', '-id')
        row = lambda r: {
            'id': r.id, 'date': r.created_at, 'description': r.description,
            'category': 'Service' if r.reference_service_sale_id else 'Product sale',
            'shop': r.shop or 'fashion', 'amount': r.amount,
        }
    else:
        qs = _expense_qs(period, shop).order_by('-created_at', '-id')
        row = lambda r: {
            'id': r.id, 'date': r.created_at, 'description': r.description,
            'category': r.category, 'shop': r.shop or '', 'amount': r.amount,
        }
    return {
        'rows': [row(r) for r in qs[:TRANSACTION_LIMIT]],
        'count': qs.count(),
        'total': _total(qs, 'amount'),
        'limit': TRANSACTION_LIMIT,
    }


def stock_breakdown(shop=None):
    """Every stocked item with units, cost/selling price and value at cost, biggest value first."""
    rows = []
    models = [m for s in (SHOPS if shop is None else (shop,)) for m in SHOP_MODELS[s]]
    for model, label in models:
        for item in model.objects.filter(stock_quantity__gt=0):
            cost = Decimal(str(item.cost_price))
            rows.append({
                'id': item.id, 'name': item.name, 'type': label,
                'units': item.stock_quantity, 'cost_price': cost, 'price': Decimal(str(item.price)),
                'value': cost * item.stock_quantity,
            })
    rows.sort(key=lambda r: r['value'], reverse=True)
    return {
        'items': rows,
        'total_units': sum(r['units'] for r in rows),
        'total_value': sum((r['value'] for r in rows), Decimal('0')),
    }


def sales_trend(period='month', shop=None):
    trend = (
        _revenue_qs(period, shop)
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(revenue=Sum('amount'))
        .order_by('day')
    )
    return [{'date': str(t['day']), 'revenue': t['revenue']} for t in trend]


def cash_flow_trend(period='month', shop=None):
    """Income vs expenses per bucket: daily up to a month, monthly for quarter/year."""
    monthly = period in ('quarter', 'year')
    trunc = TruncMonth if monthly else TruncDate
    fmt = (lambda d: d.strftime('%Y-%m')) if monthly else (lambda d: str(d))

    def bucketed(qs, field):
        rows = qs.annotate(b=trunc('created_at')).values('b').annotate(t=Sum(field))
        return {fmt(r['b']): r['t'] for r in rows}

    income = bucketed(_revenue_qs(period, shop), 'amount')
    expenses = bucketed(_expense_qs(period, shop), 'amount')
    return [
        {'date': d, 'revenue': income.get(d, 0), 'expenses': expenses.get(d, 0)}
        for d in sorted(set(income) | set(expenses))
    ]


def expenses_breakdown(period='month', shop=None):
    qs = _expense_qs(period, shop).values('category').annotate(total=Sum('amount')).order_by('-total')
    return [{'category': r['category'], 'total': r['total']} for r in qs]


def shop_breakdown(period='month'):
    """Income and expenses per storefront for the Executive view."""
    revenue = {s: _total(_revenue_qs(period, s), 'amount') for s in SHOPS}
    expenses = {s: _total(_expense_qs(period, s), 'amount') for s in SHOPS}
    top_shop = max(revenue, key=lambda k: revenue[k]) if any(revenue.values()) else None
    return {'totals': revenue, 'expenses': expenses, 'top_shop': top_shop}


def active_bookings_count():
    """Approved, upcoming salon reservations."""
    today = timezone.now().date()
    return Reservation.objects.filter(status=Reservation.STATUS_APPROVED, reservation_date__gte=today).count()
