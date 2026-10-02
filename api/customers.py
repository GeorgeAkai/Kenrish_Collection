"""Customer CRM data: every customer ranked by what they spent on products and services.

Registered users and walk-ins ("Customer not in App") share one list. Spend is product sales plus service
sales; a sale with no phone has no customer and is left out. Beauty services count towards Beauty only.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models import Count, Max, Q, Sum
from django.utils import timezone

from app1.customers import normalize_phone
from app1.models import Customer, Sale, ServiceSale

PERIOD_DAYS = {'30d': 30, '90d': 90, 'year': 365}   # anything else (incl. 'all') means all time


def _cutoff(period):
    days = PERIOD_DAYS.get(period)
    return timezone.now() - timedelta(days=days) if days else None


def _sale_totals(shop, period):
    qs = Sale.objects.filter(customer__isnull=False)
    if shop == 'beauty':
        qs = qs.filter(product__isnull=False)
    elif shop == 'fashion':
        qs = qs.filter(Q(handbag__isnull=False) | Q(clothes__isnull=False))
    cutoff = _cutoff(period)
    if cutoff:
        qs = qs.filter(created_at__gte=cutoff)
    return {r['customer']: r for r in qs.values('customer').annotate(spend=Sum('total_amount'), n=Count('id'), last=Max('created_at'))}


def _service_totals(shop, period):
    if shop == 'fashion':          # every service is a Beauty service
        return {}
    qs = ServiceSale.objects.filter(customer__isnull=False)
    cutoff = _cutoff(period)
    if cutoff:
        qs = qs.filter(served_at__gte=cutoff)
    return {r['customer']: r for r in qs.values('customer').annotate(spend=Sum('amount'), n=Count('id'), last=Max('served_at'))}


def _spend_row(sales, services):
    spend = sum((x['spend'] for x in (sales, services) if x), Decimal('0'))
    purchases = sum((x['n'] for x in (sales, services) if x), 0)
    lasts = [x['last'] for x in (sales, services) if x and x['last']]
    last = timezone.localtime(max(lasts)).date() if lasts else None
    return spend, purchases, last


def customer_rows(shop=None, period='all'):
    """All customers (linked, walk-in, and registered users who have never bought), best spenders first."""
    sales = _sale_totals(shop, period)
    services = _service_totals(shop, period)
    rows = []

    for c in Customer.objects.select_related('user', 'possible_user'):
        spend, purchases, last = _spend_row(sales.get(c.id), services.get(c.id))
        registered = c.user is not None
        rows.append({
            'ref': f'customer:{c.id}',
            'kind': 'registered' if registered else 'walkin',
            'name': c.name or (c.user.get_full_name() or c.user.username if registered else c.phone),
            'username': c.user.username if registered else None,
            'phone': c.phone,
            'user_id': c.user_id,
            'spend': spend, 'purchases': purchases, 'last_purchase': last,
            'possible_user': ({'id': c.possible_user.id, 'username': c.possible_user.username}
                              if c.possible_user and not registered else None),
        })

    for u in User.objects.filter(is_staff=False, customer__isnull=True).select_related('userprofile'):
        phone = normalize_phone(getattr(u.userprofile, 'phone', '')) or ''
        rows.append({
            'ref': f'user:{u.id}', 'kind': 'registered', 'name': u.get_full_name() or u.username,
            'username': u.username, 'phone': phone, 'user_id': u.id,
            'spend': Decimal('0'), 'purchases': 0, 'last_purchase': None, 'possible_user': None,
        })

    rows.sort(key=lambda r: (-r['spend'], -r['purchases'], r['name'].lower()))
    for r in rows:
        r['spend'] = f"{r['spend']:.2f}"
        r['last_purchase'] = str(r['last_purchase']) if r['last_purchase'] else None
    return rows
