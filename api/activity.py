import logging
import re
from datetime import timedelta

from django.db.models import Count, Max, Value
from django.db.models.functions import Coalesce, NullIf, TruncDate
from django.utils import timezone

from app1.models import ActivityLog

logger = logging.getLogger(__name__)

WRITE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
# Never logged by the middleware: tracking pings, token refreshes, the chatbot
# stream, and login/register (logged explicitly with their outcome).
SKIP_PREFIXES = (
    '/api/activity/', '/api/auth/token/refresh/', '/api/chatbot/',
    '/api/auth/login/', '/api/auth/register/',
)

# (method, path regex) -> human label for the log table.
ACTION_LABELS = [
    ('POST', r'^/api/orders/$', 'Placed an order'),
    ('POST', r'^/api/orders/\d+/cancel/$', 'Cancelled an order'),
    ('POST', r'^/api/reservations/$', 'Booked an appointment'),
    ('POST', r'^/api/reservations/\d+/cancel/$', 'Cancelled an appointment'),
    ('POST|DELETE', r'^/api/wishlist/', 'Changed wishlist'),
    ('POST', r'^/api/(products|handbags|clothes)/\d+/rate/$', 'Rated an item'),
    ('POST', r'^/api/gallery/\d+/like/$', 'Liked a gallery post'),
    ('PATCH', r'^/api/profile/$', 'Updated profile'),
    ('DELETE', r'^/api/profile/delete/$', 'Deleted own account'),
    ('POST', r'^/api/auth/change-password/', 'Changed password'),
    ('POST', r'^/api/admin/analytics/reset/$', 'Reset the dashboard'),
    ('POST', r'^/api/admin/inventory/record-sale/$', 'Recorded a sale'),
    ('PATCH', r'^/api/admin/inventory/sales/\d+/$', 'Edited a sale'),
    ('POST', r'^/api/admin/expenses/$', 'Recorded an expense'),
    ('PATCH', r'^/api/admin/expenses/\d+/$', 'Edited an expense'),
    ('DELETE', r'^/api/admin/expenses/\d+/$', 'Deleted an expense'),
    ('POST', r'^/api/admin/recurring-expenses/$', 'Added a recurring expense'),
    ('PATCH', r'^/api/admin/recurring-expenses/\d+/$', 'Edited a recurring expense'),
    ('DELETE', r'^/api/admin/recurring-expenses/\d+/$', 'Deleted a recurring expense'),
    ('POST', r'^/api/admin/employees/$', 'Added an employee'),
    ('PATCH', r'^/api/admin/employees/\d+/$', 'Edited an employee'),
    ('DELETE', r'^/api/admin/employees/\d+/$', 'Deleted an employee'),
    ('POST', r'^/api/admin/customers/\d+/link/$', 'Linked a customer to a registered user'),
    ('PATCH', r'^/api/admin/customers/\w+/\d+/$', 'Edited a customer'),
    ('POST', r'^/api/admin/inventory/add-stock/$', 'Added stock'),
    ('POST', r'^/api/admin/inventory/clear-sales/$', 'Cleared sales data'),
    ('POST', r'^/api/admin/service-sales/$', 'Recorded a service sale'),
    ('PATCH', r'^/api/admin/service-sales/\d+/$', 'Edited a service sale'),
    ('DELETE', r'^/api/admin/service-sales/\d+/$', 'Deleted a service sale'),
    ('POST', r'^/api/admin/users/\d+/promote/$', 'Promoted a user to admin'),
    ('POST', r'^/api/admin/users/\d+/demote/$', 'Demoted an admin'),
    ('DELETE', r'^/api/admin/users/\d+/delete/$', 'Deleted a user'),
    ('DELETE', r'^/api/admin/activity/purge/$', 'Purged old activity logs'),
    ('POST', r'^/api/admin/reviews/$', 'Added a customer review'),
    ('DELETE', r'^/api/admin/reviews/\d+/$', 'Deleted a customer review'),
    ('POST', r'^/api/admin/', 'Admin: created'),
    ('PATCH|PUT', r'^/api/admin/', 'Admin: edited'),
    ('DELETE', r'^/api/admin/', 'Admin: deleted'),
]


def describe_action(method, path):
    for methods, pattern, label in ACTION_LABELS:
        if method in methods.split('|') and re.search(pattern, path):
            return label
    return f'{method} {path}'


def client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return (forwarded.split(',')[0].strip() or request.META.get('REMOTE_ADDR') or None)


def log_event(request, event, user=None, **fields):
    """Record an activity row. Never raises: logging must not break a request."""
    try:
        if user is None:
            candidate = getattr(request, 'user', None)
            user = candidate if candidate is not None and candidate.is_authenticated else None
        ActivityLog.objects.create(
            user=user,
            username=(user.username if user else fields.pop('username', ''))[:150],
            event=event,
            ip_address=client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:300],
            **{k: (v[:500] if isinstance(v, str) else v) for k, v in fields.items()},
        )
    except Exception:
        logger.exception('Could not write activity log')


class ActivityLogMiddleware:
    """Logs every state-changing /api/ call made by a signed-in user."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            path = request.path
            if (request.method in WRITE_METHODS and path.startswith('/api/')
                    and not path.startswith(SKIP_PREFIXES) and response.status_code < 500):
                user = self._user(request)
                if user:
                    log_event(
                        request, 'action', user=user, path=path, method=request.method,
                        status_code=response.status_code, detail=describe_action(request.method, path),
                    )
        except Exception:
            logger.exception('Activity middleware failed')
        return response

    @staticmethod
    def _user(request):
        """Resolve the JWT user (this middleware runs before DRF authenticates)."""
        from rest_framework_simplejwt.authentication import JWTAuthentication
        try:
            result = JWTAuthentication().authenticate(request)
        except Exception:
            return None
        return result[0] if result else None


# ---------------------------------------------------------------------------
# Stats for the Activity Logs overview
# ---------------------------------------------------------------------------

PERIOD_DAYS = {'today': 0, 'week': 7, 'month': 30, 'quarter': 90, 'year': 365}


def _in_period(period):
    today = timezone.localdate()
    days = PERIOD_DAYS.get(period, PERIOD_DAYS['month'])
    if period == 'today':
        return ActivityLog.objects.filter(created_at__date=today)
    return ActivityLog.objects.filter(created_at__date__gte=today - timedelta(days=days))


def activity_stats(period='month'):
    qs = _in_period(period)
    visitor = Coalesce(NullIf('username', Value('')), NullIf('client_id', Value('')))
    views = qs.filter(event='page_view')

    by_event = dict(qs.values_list('event').annotate(n=Count('id')))
    unique_visitors = qs.annotate(v=visitor).exclude(v__isnull=True).values('v').distinct().count()
    signed_in_users = qs.exclude(username='').values('username').distinct().count()

    daily = (
        views.annotate(day=TruncDate('created_at'), v=visitor).values('day')
        .annotate(page_views=Count('id'), visitors=Count('v', distinct=True)).order_by('day')
    )
    top_pages = views.values('path').annotate(views=Count('id')).order_by('-views')[:10]
    top_products = (
        qs.filter(event='product_view').values('object_type', 'object_id', 'object_name')
        .annotate(views=Count('id')).order_by('-views')[:10]
    )
    top_searches = (
        views.filter(detail__startswith='search: ').values('detail')
        .annotate(n=Count('id')).order_by('-n')[:10]
    )
    top_users = (
        qs.exclude(username='').values('username')
        .annotate(events=Count('id'), last_seen=Max('created_at')).order_by('-events')[:10]
    )
    failed = qs.filter(event='login_failed').order_by('-created_at')[:10]

    return {
        'totals': {
            'events': qs.count(),
            'page_views': by_event.get('page_view', 0),
            'product_views': by_event.get('product_view', 0),
            'unique_visitors': unique_visitors,
            'signed_in_users': signed_in_users,
            'logins': by_event.get('login', 0),
            'failed_logins': by_event.get('login_failed', 0),
            'actions': by_event.get('action', 0),
        },
        'daily': [{'date': str(d['day']), 'page_views': d['page_views'], 'visitors': d['visitors']} for d in daily],
        'top_pages': list(top_pages),
        'top_products': [
            {'type': r['object_type'], 'id': r['object_id'], 'name': r['object_name'], 'views': r['views']}
            for r in top_products
        ],
        'top_searches': [{'term': r['detail'].removeprefix('search: '), 'count': r['n']} for r in top_searches],
        'top_users': list(top_users),
        'recent_failed_logins': [
            {'username': f.detail.removeprefix('tried: '), 'ip': f.ip_address, 'at': f.created_at} for f in failed
        ],
    }
