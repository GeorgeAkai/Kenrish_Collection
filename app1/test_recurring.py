from datetime import date
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase

from .models import Expense, RecurringExpense
from .recurring import post_due_recurring

OCT_2 = date(2026, 10, 2)


class PostDueRecurringTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)

    def _template(self, **over):
        data = dict(name='Monthly rent', category='Rent', shop=None, kind='fixed', amount=Decimal('30000'),
                    start_date=date(2026, 10, 1), created_by=self.admin)
        data.update(over)
        return RecurringExpense.objects.create(**data)

    def test_a_fixed_template_posts_this_months_expense_dated_the_first(self):
        template = self._template()
        self.assertEqual(post_due_recurring(today=OCT_2), 1)
        e = Expense.objects.get()
        self.assertEqual((e.description, e.category, e.amount, e.shop), ('Monthly rent', 'Rent', Decimal('30000'), None))
        self.assertEqual(e.date_purchased, date(2026, 10, 1))
        self.assertEqual(e.recurring, template)
        self.assertEqual(e.created_by, self.admin)

    def test_posting_again_never_duplicates(self):
        self._template()
        post_due_recurring(today=OCT_2)
        self.assertEqual(post_due_recurring(today=OCT_2), 0)
        self.assertEqual(post_due_recurring(today=date(2026, 10, 30)), 0)
        self.assertEqual(Expense.objects.count(), 1)

    def test_months_missed_while_nobody_opened_the_page_are_caught_up(self):
        self._template(start_date=date(2026, 7, 15))
        self.assertEqual(post_due_recurring(today=OCT_2), 4)  # Jul, Aug, Sep, Oct
        self.assertEqual(sorted(e.date_purchased for e in Expense.objects.all()),
                         [date(2026, 7, 1), date(2026, 8, 1), date(2026, 9, 1), date(2026, 10, 1)])
        self.assertEqual(post_due_recurring(today=date(2026, 11, 3)), 1)  # next month adds just November

    def test_a_variable_template_posts_an_entry_awaiting_its_amount(self):
        self._template(name='Electricity', category='Electricity', kind='variable', amount=None)
        post_due_recurring(today=OCT_2)
        e = Expense.objects.get()
        self.assertIsNone(e.amount)
        self.assertEqual(e.category, 'Electricity')

    def test_a_template_that_starts_next_month_posts_nothing_yet(self):
        self._template(start_date=date(2026, 11, 1))
        self.assertEqual(post_due_recurring(today=OCT_2), 0)

    def test_paused_templates_stop_posting(self):
        t = self._template()
        post_due_recurring(today=OCT_2)
        t.active = False
        t.save()
        self.assertEqual(post_due_recurring(today=date(2026, 11, 3)), 0)
        self.assertEqual(Expense.objects.count(), 1)

    def test_changing_a_templates_amount_does_not_rewrite_months_already_posted(self):
        t = self._template(amount=Decimal('30000'))
        post_due_recurring(today=OCT_2)
        t.amount = Decimal('32000')
        t.save()
        post_due_recurring(today=date(2026, 11, 3))
        self.assertEqual(sorted(Expense.objects.values_list('amount', flat=True)), [Decimal('30000'), Decimal('32000')])

    def test_deleting_a_template_keeps_what_it_already_posted(self):
        t = self._template()
        post_due_recurring(today=OCT_2)
        t.delete()
        e = Expense.objects.get()
        self.assertIsNone(e.recurring)
        self.assertEqual(post_due_recurring(today=date(2026, 11, 3)), 0)
