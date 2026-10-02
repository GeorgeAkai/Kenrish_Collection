import calendar
from decimal import Decimal, ROUND_HALF_UP

from django.utils import timezone

from .models import Employee, Expense


def _months(start, end):
    """First-of-month dates from start's month through end's month, inclusive."""
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        yield start.replace(year=y, month=m, day=1)
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def salary_for_month(employee, first_of_month):
    """The month's salary, prorated by days employed (inclusive) in that month. Zero if not employed in it."""
    days_in_month = calendar.monthrange(first_of_month.year, first_of_month.month)[1]
    last_of_month = first_of_month.replace(day=days_in_month)
    first_day = max(employee.start_date, first_of_month)
    last_day = min(employee.end_date or last_of_month, last_of_month)
    days_worked = (last_day - first_day).days + 1
    if days_worked <= 0:
        return Decimal('0.00')
    if days_worked >= days_in_month:
        return employee.monthly_salary
    return (employee.monthly_salary * days_worked / days_in_month).quantize(Decimal('0.01'), ROUND_HALF_UP)


def post_due_salaries(today=None):
    """Post each employee's salary as a Salaries expense for every month that has none yet. Posting starts in the
    month the employee was added to the system (or their start date if later), so entering someone hired long ago
    does not back-fill years of history. Safe to call repeatedly (there is no scheduler). Returns how many were created."""
    today = today or timezone.localdate()
    created = 0
    for emp in Employee.objects.all():
        added = timezone.localtime(emp.created_at).date()
        begin = max(emp.start_date, added)
        last = min(today, emp.end_date) if emp.end_date else today
        if begin > last:
            continue
        for period in _months(begin, last):
            amount = salary_for_month(emp, period)
            if amount <= 0:
                continue
            _, was_created = Expense.objects.get_or_create(
                employee=emp, period=period,
                defaults=dict(
                    description=f'Salary: {emp.name}', category='Salaries', amount=amount,
                    shop=emp.shop if emp.shop in ('beauty', 'fashion') else None,  # "both" is a shared cost
                    date_purchased=period, created_by=emp.created_by,
                ),
            )
            created += was_created
    return created
