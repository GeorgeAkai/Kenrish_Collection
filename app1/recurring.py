from django.utils import timezone

from .models import Expense, RecurringExpense


def _months(start, end):
    """First-of-month dates from start's month through end's month, inclusive."""
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        yield start.replace(year=y, month=m, day=1)
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def post_due_recurring(today=None):
    """Create the expense row for every active template and month that has none yet. Safe to call as often
    as you like (there is no scheduler, so the admin pages call it when opened). Returns how many were created."""
    today = today or timezone.localdate()
    created = 0
    for template in RecurringExpense.objects.filter(active=True, start_date__lte=today):
        for period in _months(template.start_date, today):
            _, was_created = Expense.objects.get_or_create(
                recurring=template, period=period,
                defaults=dict(
                    description=template.name, category=template.category, shop=template.shop,
                    amount=template.amount if template.kind == 'fixed' else None,
                    date_purchased=period, created_by=template.created_by,
                ),
            )
            created += was_created
    return created
