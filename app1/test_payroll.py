from datetime import date, datetime, timezone as dt_timezone
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from .models import Employee, Expense
from .payroll import post_due_salaries

OCT_20 = date(2026, 10, 20)
SALARY = Decimal('31000')   # October has 31 days, so Ksh 1,000 a day


class PostDueSalariesTest(TestCase):
    """Salaries post from the month the employee was added to the system (never back-filling history)."""

    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)

    def _employee(self, added=date(2026, 10, 1), **over):
        data = dict(name='Wanjiru', monthly_salary=SALARY, shop='beauty', start_date=date(2026, 1, 1), created_by=self.admin)
        data.update(over)
        emp = Employee.objects.create(**data)
        Employee.objects.filter(pk=emp.pk).update(created_at=datetime(added.year, added.month, added.day, 9, tzinfo=dt_timezone.utc))
        emp.refresh_from_db()
        return emp

    def test_a_full_months_salary_posts_as_a_salaries_expense_dated_the_first(self):
        emp = self._employee()
        self.assertEqual(post_due_salaries(today=OCT_20), 1)
        e = Expense.objects.get()
        self.assertEqual((e.category, e.amount, e.shop), ('Salaries', SALARY, 'beauty'))
        self.assertEqual(e.date_purchased, date(2026, 10, 1))
        self.assertEqual(e.employee, emp)
        self.assertIn('Wanjiru', e.description)

    def test_an_employee_working_both_shops_is_a_shared_cost(self):
        self._employee(shop='both')
        post_due_salaries(today=OCT_20)
        self.assertIsNone(Expense.objects.get().shop)

    def test_the_first_month_is_prorated_by_days_from_the_start_date(self):
        self._employee(start_date=date(2026, 10, 16))   # works 16th..31st = 16 days of 31
        post_due_salaries(today=OCT_20)
        self.assertEqual(Expense.objects.get().amount, Decimal('16000.00'))

    def test_the_last_month_is_prorated_up_to_the_end_date(self):
        self._employee(end_date=date(2026, 10, 10))     # works 1st..10th = 10 days
        post_due_salaries(today=OCT_20)
        self.assertEqual(Expense.objects.get().amount, Decimal('10000.00'))

    def test_a_one_day_overlap_and_odd_divisions_round_to_cents(self):
        self._employee(monthly_salary=Decimal('10000'), start_date=date(2026, 10, 31))
        post_due_salaries(today=OCT_20 .replace(day=31))
        self.assertEqual(Expense.objects.get().amount, Decimal('322.58'))  # 10000 / 31, 1 day

    def test_months_missed_since_the_employee_was_added_are_caught_up_and_stop_at_the_end_date(self):
        self._employee(added=date(2026, 7, 1), end_date=date(2026, 9, 15))
        self.assertEqual(post_due_salaries(today=OCT_20), 3)   # Jul full, Aug full, Sep half; nothing for Oct
        amounts = {e.date_purchased: e.amount for e in Expense.objects.all()}
        self.assertEqual(amounts[date(2026, 7, 1)], SALARY)
        self.assertEqual(amounts[date(2026, 8, 1)], SALARY)
        self.assertEqual(amounts[date(2026, 9, 1)], Decimal('15500.00'))  # 15 of September's 30 days
        self.assertNotIn(date(2026, 10, 1), amounts)

    def test_entering_someone_hired_long_ago_does_not_back_fill_history(self):
        self._employee(added=date(2026, 10, 5), start_date=date(2024, 3, 1))
        self.assertEqual(post_due_salaries(today=OCT_20), 1)   # October only
        self.assertEqual(Expense.objects.get().date_purchased, date(2026, 10, 1))

    def test_an_employee_who_starts_next_month_posts_nothing_yet(self):
        self._employee(start_date=date(2026, 11, 3))
        self.assertEqual(post_due_salaries(today=OCT_20), 0)

    def test_posting_again_never_duplicates(self):
        self._employee()
        post_due_salaries(today=OCT_20)
        self.assertEqual(post_due_salaries(today=OCT_20), 0)
        self.assertEqual(post_due_salaries(today=date(2026, 10, 31)), 0)
        self.assertEqual(Expense.objects.count(), 1)

    def test_a_raise_applies_from_the_next_month_and_never_rewrites_a_posted_one(self):
        emp = self._employee()
        post_due_salaries(today=OCT_20)
        emp.monthly_salary = Decimal('40000')
        emp.save()
        post_due_salaries(today=date(2026, 11, 3))
        self.assertEqual(sorted(Expense.objects.values_list('amount', flat=True)), [SALARY, Decimal('40000')])

    def test_deleting_an_employee_keeps_the_salaries_already_posted(self):
        emp = self._employee()
        post_due_salaries(today=OCT_20)
        emp.delete()
        e = Expense.objects.get()
        self.assertIsNone(e.employee)
        self.assertEqual(post_due_salaries(today=date(2026, 11, 3)), 0)
