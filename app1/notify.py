"""In-app notifications: the rows behind the bell inbox.

Everything here writes to our own database; nothing calls an outside service.
Every public function swallows its own errors and logs them, so a notification
problem can never break a booking, an order or a stock update.

Events (called from app1/signals.py and the API):
  reservation created / approved / declined / cancelled
  order placed / confirmed / cancelled
  wishlisted item back in stock or down to its last one
  password changed, staff account added

Scheduled checks (run_due_checks): appointment-tomorrow reminders, the morning
low-stock digest for staff, the monthly "no expenses recorded" data check, and
30-day cleanup. They are idempotent (dedupe_key), so running them often is safe:
`python manage.py notification_checks` from cron, and the notifications endpoint
also triggers them at most every few minutes per worker.
"""
import logging
import time
from datetime import timedelta

from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone

logger = logging.getLogger(__name__)

KEEP_DAYS = 30
CHECK_EVERY_SECONDS = 600
_last_check = 0.0


def _thumb(item):
    try:
        return item.image.url if getattr(item, 'image', None) else ''
    except Exception:
        return ''


def _when(res):
    return f"{res.reservation_date.strftime('%a %d %b')} at {res.reservation_time.strftime('%I:%M %p').lstrip('0')}"


def _service_name(res):
    return res.service.name if res.service_id and res.service else 'Salon appointment'


def notify(user, kind, title, body='', link='', action_label='', priority=False,
           ref_type='', ref_id=None, thumb='', dedupe_key=''):
    """Create one notification. With a dedupe_key, at most one row per user and key ever exists."""
    from .models import Notification
    try:
        if dedupe_key and Notification.objects.filter(user=user, dedupe_key=dedupe_key).exists():
            return None
        return Notification.objects.create(
            user=user, kind=kind, title=title[:160], body=body[:300], link=link,
            action_label=action_label, priority=priority, ref_type=ref_type, ref_id=ref_id,
            thumb=thumb, dedupe_key=dedupe_key,
        )
    except Exception:
        logger.exception('Could not create notification %r for user %s', title, getattr(user, 'pk', None))
        return None


def staff_users():
    return User.objects.filter(is_staff=True, is_active=True)


def notify_staff(exclude=None, **kwargs):
    for u in staff_users():
        if exclude is not None and u.pk == exclude.pk:
            continue
        notify(u, **kwargs)


def mark_handled(ref_type, ref_id, kind=None):
    """An item was dealt with (e.g. a booking approved): clear it from every staff inbox."""
    from .models import Notification
    try:
        qs = Notification.objects.filter(ref_type=ref_type, ref_id=ref_id, read_at__isnull=True)
        if kind:
            qs = qs.filter(kind=kind)
        qs.update(read_at=timezone.now())
    except Exception:
        logger.exception('Could not mark %s %s handled', ref_type, ref_id)


# ── Reservations ────────────────────────────────────────────────────────────

def reservation_created(res):
    try:
        notify(res.customer, 'booking', 'Booking request received',
               f'{_service_name(res)} on {_when(res)}. We’ll confirm it here shortly.',
               link='/beauty/reservations', action_label='View booking',
               ref_type='reservation', ref_id=res.pk)
        notify_staff(kind='approval', title='New booking needs approval',
                     body=f'{res.customer.username} · {_service_name(res)} · {_when(res)}',
                     link='/admin/reservations', action_label='Review', priority=True,
                     ref_type='reservation', ref_id=res.pk)
    except Exception:
        logger.exception('reservation_created notification failed')


def reservation_status_changed(res, old_status):
    from .models import Reservation
    try:
        if res.status == old_status:
            return
        if res.status in (Reservation.STATUS_APPROVED, Reservation.STATUS_REJECTED, Reservation.STATUS_CANCELLED):
            mark_handled('reservation', res.pk, kind='approval')
        if res.status == Reservation.STATUS_APPROVED:
            notify(res.customer, 'booking', 'Booking confirmed',
                   f'{_service_name(res)} on {_when(res)} at Shabaab, Nakuru.',
                   link='/beauty/reservations', action_label='View booking',
                   ref_type='reservation', ref_id=res.pk)
        elif res.status == Reservation.STATUS_REJECTED:
            notify(res.customer, 'booking', 'Booking declined',
                   f'{_service_name(res)} on {_when(res)} isn’t available. Pick another free time.',
                   link='/beauty/reservations', action_label='Choose another time',
                   ref_type='reservation', ref_id=res.pk)
        elif res.status == Reservation.STATUS_CANCELLED and old_status in (
                Reservation.STATUS_PENDING, Reservation.STATUS_APPROVED):
            notify_staff(kind='cancel', title='Booking cancelled',
                         body=f'{res.customer.username} cancelled {_service_name(res)} on {_when(res)}. The slot is free again.',
                         link='/admin/reservations', action_label='View bookings',
                         ref_type='reservation', ref_id=res.pk)
    except Exception:
        logger.exception('reservation_status_changed notification failed')


# ── Orders ──────────────────────────────────────────────────────────────────

def order_created(order):
    try:
        notify_staff(kind='order', title=f'New order #{order.pk}',
                     body=f'{order.customer.username} · KES {order.total_amount:,.0f}',
                     link='/admin/orders', action_label='View order',
                     ref_type='order', ref_id=order.pk)
    except Exception:
        logger.exception('order_created notification failed')


def order_status_changed(order, old_status):
    from .models import Order
    try:
        if order.status == old_status:
            return
        mark_handled('order', order.pk, kind='order')
        if order.status == Order.STATUS_CONFIRMED:
            notify(order.customer, 'order', f'Order #{order.pk} is ready for pickup',
                   'Collect it at Shabaab, Nakuru, Mon–Sat 7:30 AM–7 PM.',
                   link='/orders', action_label='View order', ref_type='order', ref_id=order.pk)
        elif order.status == Order.STATUS_CANCELLED and old_status == Order.STATUS_PENDING:
            # Either side can cancel a pending order; tell the other side.
            notify(order.customer, 'order', f'Order #{order.pk} was cancelled',
                   'Nothing was charged. Your items are still in the shop if you change your mind.',
                   link='/orders', action_label='View orders', ref_type='order', ref_id=order.pk,
                   dedupe_key=f'order-cancel:{order.pk}')
            notify_staff(kind='order', title=f'Order #{order.pk} cancelled',
                         body=f'{order.customer.username} · KES {order.total_amount:,.0f}',
                         link='/admin/orders', action_label='View orders',
                         ref_type='order', ref_id=order.pk, dedupe_key=f'order-cancel:{order.pk}')
    except Exception:
        logger.exception('order_status_changed notification failed')


# ── Wishlist stock ──────────────────────────────────────────────────────────

_ITEM_PATHS = {'Product': '/products/{}', 'Handbag': '/handbags/{}', 'Clothes': '/clothes/{}'}


def _wishlisters(item):
    try:
        return User.objects.filter(wishlist__in=item.wishlisted_by.all()).distinct()
    except Exception:
        return User.objects.none()


def stock_changed(item, old_qty):
    """Back in stock (0 -> more) and last-one alerts for people who wishlisted the item.
    Several restocks on the same day fold into one grouped notification."""
    from .models import Notification
    try:
        new_qty = item.stock_quantity
        if old_qty is None or new_qty == old_qty or not getattr(item, 'is_published', True):
            return
        path = _ITEM_PATHS.get(type(item).__name__, '/').format(item.pk)
        today = timezone.localdate()
        price = f'KES {item.price:,.0f}' if getattr(item, 'price', None) is not None else ''
        if old_qty == 0 and new_qty > 0:
            for user in _wishlisters(item):
                key = f'restock:{type(item).__name__}:{item.pk}:{today}'
                if Notification.objects.filter(user=user, dedupe_key=key).exists():
                    continue
                earlier = (Notification.objects
                           .filter(user=user, kind='stock', read_at__isnull=True,
                                   created_at__date=today, dedupe_key__startswith='restock:')
                           .first())
                if earlier:
                    n = int(earlier.ref_id or 1) + 1
                    earlier.title = f'{n} wishlist items are back in stock'
                    earlier.body = f'Including {item.name}.'
                    earlier.link = '/wishlist'
                    earlier.action_label = 'View wishlist'
                    earlier.ref_id = n
                    earlier.save(update_fields=['title', 'body', 'link', 'action_label', 'ref_id'])
                    # Record that this item is covered by the grouped row.
                    Notification.objects.create(user=user, kind='stock', title=item.name, dedupe_key=key,
                                                read_at=timezone.now())
                    continue
                notify(user, 'stock', f'Back in stock: {item.name}', price,
                       link=path, action_label='View item', thumb=_thumb(item),
                       ref_type='restock', ref_id=1, dedupe_key=key)
        elif new_qty == 1 and old_qty > 1:
            for user in _wishlisters(item):
                notify(user, 'stock', f'Only 1 left: {item.name}', price,
                       link=path, action_label='View item', thumb=_thumb(item),
                       dedupe_key=f'last-one:{type(item).__name__}:{item.pk}:{today}')
    except Exception:
        logger.exception('stock_changed notification failed')


# ── Security ────────────────────────────────────────────────────────────────

def password_changed(user):
    notify(user, 'security', 'Your password was changed',
           'If this wasn’t you, call the shop on 0708 440390 right away.',
           link='/profile', action_label='View profile')


def staff_added(user):
    notify_staff(exclude=user, kind='security', title='New admin added',
                 body=f'{user.username} now has admin access.', link='/admin/users', action_label='View users')


# ── Scheduled checks ────────────────────────────────────────────────────────

def appointment_reminders():
    from .models import Reservation
    tomorrow = timezone.localdate() + timedelta(days=1)
    for res in (Reservation.objects.filter(reservation_date=tomorrow, status=Reservation.STATUS_APPROVED)
                .select_related('service', 'customer')):
        notify(res.customer, 'reminder', f'Your appointment is tomorrow at {res.reservation_time.strftime("%I:%M %p").lstrip("0")}',
               f'{_service_name(res)} at Shabaab, Nakuru.', link='/beauty/reservations',
               action_label='View booking', ref_type='reservation', ref_id=res.pk,
               dedupe_key=f'reminder:{res.pk}:{tomorrow}')


def low_stock_digest():
    """One morning digest per staff user, never one alert per item."""
    from .models import Product, Handbag, Clothes
    now = timezone.localtime()
    if now.hour < 7:
        return
    low = []
    for model in (Product, Handbag, Clothes):
        qs = model.objects.all()
        if hasattr(model, 'is_published'):
            qs = qs.filter(is_published=True)
        low += [i.name for i in qs if i.stock_quantity <= i.reorder_level]
    if not low:
        return
    names = ', '.join(low[:3]) + (f' and {len(low) - 3} more' if len(low) > 3 else '')
    notify_staff(kind='inventory', title=f'{len(low)} item{"s" if len(low) != 1 else ""} at or below reorder level',
                 body=names, link='/admin/inventory', action_label='Open inventory',
                 dedupe_key=f'lowstock:{now.date()}')


def expense_data_check():
    from .models import Expense
    today = timezone.localdate()
    if today.day < 7:
        return
    if Expense.objects.filter(date_purchased__year=today.year, date_purchased__month=today.month).exists():
        return
    notify_staff(kind='data', title='No expenses recorded this month',
                 body='Net profit will look higher than it is until expenses are added.',
                 link='/admin/expenses', action_label='Add expenses',
                 dedupe_key=f'noexpense:{today:%Y-%m}')


def cleanup():
    from .models import Notification
    Notification.objects.filter(created_at__lt=timezone.now() - timedelta(days=KEEP_DAYS)).delete()


def run_due_checks(force=False):
    """Run every scheduled check. Throttled per process unless force=True."""
    global _last_check
    if not force and time.monotonic() - _last_check < CHECK_EVERY_SECONDS:
        return
    _last_check = time.monotonic()
    for check in (appointment_reminders, low_stock_digest, expense_data_check, cleanup):
        try:
            check()
        except Exception:
            logger.exception('Notification check %s failed', check.__name__)


def visible_to(user):
    from .models import Notification
    cutoff = timezone.now() - timedelta(days=KEEP_DAYS)
    # Rows that only record a grouped restock are created already read and have no body/link.
    return (Notification.objects.filter(user=user, created_at__gte=cutoff)
            .exclude(Q(dedupe_key__startswith='restock:') & Q(link='')))
