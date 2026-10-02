"""Customer CRM data: every customer ranked by what they spent on products and services.

Registered users and walk-ins ("Customer not in App") share one list. Spend is product sales plus service
sales; a sale with no phone has no customer and is left out. Beauty services count towards Beauty only.
"""
from datetime import datetime, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models import Count, Max, Min, Q, Sum
from django.utils import timezone

from app1.customers import normalize_phone
from app1.models import (
    ClothesRating, Customer, HandbagRating, LoginEvent, Order, Rating, Reservation, Sale, ServiceSale,
)

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


# ---------------------------------------------------------------------------
# One customer's profile
# ---------------------------------------------------------------------------

TIMELINE_LIMIT = 200
MONTHS_SHOWN = 12


def resolve_customer_ref(kind, pk):
    """('customer', 12) or ('user', 5) -> (Customer or None, User or None); None if there is no such customer.
    Staff accounts are not customers."""
    if kind == 'customer':
        customer = Customer.objects.select_related('user').filter(pk=pk).first()
        return (customer, customer.user) if customer else None
    if kind == 'user':
        user = User.objects.filter(pk=pk, is_staff=False).first()
        return (getattr(user, 'customer', None), user) if user else None
    return None


def _aware(day, clock):
    return timezone.make_aware(datetime.combine(day, clock))


def _timeline(customer, user):
    events = []
    if customer:
        for s in customer.sales.select_related('product', 'handbag', 'clothes'):
            item = s._target_item()
            events.append({'type': 'sale', 'date': s.created_at, 'amount': s.total_amount,
                           'title': f"{item.name if item else 'Item'} × {s.quantity}", 'detail': ''})
        for s in customer.service_sales.all():
            events.append({'type': 'service', 'date': s.served_at, 'amount': s.amount, 'title': s.service_name,
                           'detail': s.get_payment_method_display()})
    if user:
        for o in Order.objects.filter(customer=user):
            events.append({'type': 'order', 'date': o.created_at, 'amount': o.total_amount,
                           'title': f'Online order #{o.id}', 'detail': o.get_status_display()})
        for r in Reservation.objects.filter(customer=user).select_related('service'):
            events.append({'type': 'reservation', 'date': _aware(r.reservation_date, r.reservation_time), 'amount': None,
                           'title': f"Appointment: {r.service.name if r.service else 'Service'}", 'detail': r.get_status_display()})
        for r in Rating.objects.filter(user=user).select_related('product'):
            events.append({'type': 'rating', 'date': r.created_at, 'amount': None,
                           'title': f'Rated {r.product.name}', 'detail': f'{r.value}/5'})
        for r in HandbagRating.objects.filter(user=user).select_related('handbag'):
            events.append({'type': 'rating', 'date': r.created_at, 'amount': None,
                           'title': f'Rated {r.handbag.name}', 'detail': f'{r.rating}/5'})
        for r in ClothesRating.objects.filter(user=user).select_related('clothes'):
            events.append({'type': 'rating', 'date': r.created_at, 'amount': None,
                           'title': f'Rated {r.clothes.name}', 'detail': f'{r.rating}/5'})
    events.sort(key=lambda e: e['date'], reverse=True)
    return [{**e, 'date': e['date'].isoformat(), 'amount': f"{e['amount']:.2f}" if e['amount'] is not None else None}
            for e in events[:TIMELINE_LIMIT]]


def _spend_by_month(customer):
    today = timezone.localdate()
    months = []
    y, m = today.year, today.month
    for _ in range(MONTHS_SHOWN):
        months.append((y, m))
        y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    months.reverse()
    totals = {k: Decimal('0') for k in months}
    if customer:
        for when, amount in [(s.created_at, s.total_amount) for s in customer.sales.all()] + \
                            [(s.served_at, s.amount) for s in customer.service_sales.all()]:
            local = timezone.localtime(when)
            key = (local.year, local.month)
            if key in totals:
                totals[key] += amount
    return [{'month': f'{y}-{m:02d}', 'spend': f'{totals[(y, m)]:.2f}'} for (y, m) in months]


def _wishlist(user):
    wishlist = getattr(user, 'wishlist', None)
    if not wishlist:
        return []
    items = []
    for kind, qs in (('product', wishlist.products.all()), ('handbag', wishlist.handbags.all()), ('clothes', wishlist.clothes.all())):
        items += [{'type': kind, 'id': i.id, 'name': i.name, 'price': f'{i.price:.2f}'} for i in qs]
    return items


def _login_stats(user):
    """Detail from LoginEvent, which only exists from when it was introduced; `tracked_since` says from when.
    (metrics.logins is the older lifetime total kept on the profile.)"""
    events = LoginEvent.objects.filter(user=user)
    first = LoginEvent.objects.aggregate(first=Min('created_at'))['first']
    return {
        'last_30_days': events.filter(created_at__gte=timezone.now() - timedelta(days=30)).count(),
        'web': events.filter(source='web').count(),
        'app': events.filter(source='app').count(),
        'tracked_since': str(timezone.localtime(first).date()) if first else None,
    }


def customer_profile(customer, user):
    sales = _sale_totals(None, 'all').get(customer.id) if customer else None
    services = _service_totals(None, 'all').get(customer.id) if customer else None
    spend, purchases, last = _spend_row(sales, services)
    registered = user is not None
    name = (customer.name if customer and customer.name else None) or (user.get_full_name() or user.username if registered else customer.phone)
    phone = customer.phone if customer else (normalize_phone(getattr(user.userprofile, 'phone', '')) or '')
    return {
        'ref': f'customer:{customer.id}' if customer else f'user:{user.id}',
        'kind': 'registered' if registered else 'walkin',
        'name': name,
        'username': user.username if registered else None,
        'email': user.email if registered else '',
        'joined': str(timezone.localtime(user.date_joined).date()) if registered else None,
        'phone': phone,
        'user_id': user.id if registered else None,
        'customer_id': customer.id if customer else None,
        'possible_user': ({'id': customer.possible_user.id, 'username': customer.possible_user.username}
                          if customer and not registered and customer.possible_user else None),
        'metrics': {
            'total_spend': f'{spend:.2f}',
            'purchases': purchases,
            'average_purchase': f'{(spend / purchases):.2f}' if purchases else '0.00',
            'last_purchase': str(last) if last else None,
            'logins': user.userprofile.login_count if registered else None,
            'last_seen': user.last_login.isoformat() if registered and user.last_login else None,
        },
        'login_stats': _login_stats(user) if registered else None,
        'spend_by_month': _spend_by_month(customer),
        'timeline': _timeline(customer, user),
        'wishlist': _wishlist(user) if registered else None,
    }
