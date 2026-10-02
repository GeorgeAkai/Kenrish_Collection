from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from api.analytics import cash_flow_trend, expenses_breakdown, sales_summary, transactions
from app1.models import Expense


class ExpenseAnalyticsDateTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)

    def _expense(self, days_ago, amount='5000', shop='fashion', category='Fashion (Clothes)'):
        return Expense.objects.create(
            description='Jacket bale', amount=Decimal(amount), category=category, shop=shop,
            created_by=self.admin, date_purchased=timezone.localdate() - timedelta(days=days_ago),
        )

    def test_period_uses_date_purchased_not_the_time_it_was_entered(self):
        self._expense(days_ago=40)  # bought 40 days ago, entered just now
        self.assertEqual(sales_summary('month')['expenses'], 0)
        self.assertEqual(sales_summary('quarter')['expenses'], Decimal('5000'))

    def test_cash_flow_chart_buckets_expenses_by_purchase_date(self):
        e = self._expense(days_ago=40)
        bought = e.date_purchased.strftime('%Y-%m')
        buckets = {b['date']: b['expenses'] for b in cash_flow_trend('quarter')}
        self.assertEqual(buckets[bought], Decimal('5000'))
        this_month = timezone.localdate().strftime('%Y-%m')
        if this_month != bought:
            self.assertEqual(buckets.get(this_month, 0), 0)

    def test_drill_down_rows_show_the_purchase_date_newest_purchase_first(self):
        self._expense(days_ago=20, amount='100')
        self._expense(days_ago=2, amount='200')
        self._expense(days_ago=10, amount='300')
        rows = transactions('expense', 'quarter')['rows']
        self.assertEqual([r['amount'] for r in rows], [Decimal('200'), Decimal('300'), Decimal('100')])
        self.assertEqual(rows[0]['date'], timezone.localdate() - timedelta(days=2))


from rest_framework.test import APIClient  # noqa: E402

from app1.models import AuditEntry, CashFlow, RecurringExpense  # noqa: E402


class ExpenseAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def _post(self, **over):
        data = {'description': 'Jacket bale', 'amount': '45000', 'category': 'Fashion (Clothes)',
                'shop': 'fashion', 'date_purchased': str(timezone.localdate() - timedelta(days=3)), 'note': '50 pcs'}
        data.update(over)
        return self.client.post('/api/admin/expenses/', data, format='json')

    def test_admin_records_a_bale_with_purchase_date_shop_and_note(self):
        r = self._post()
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertEqual(body['amount'], '45000.00')
        self.assertEqual(body['shop'], 'fashion')
        self.assertEqual(body['note'], '50 pcs')
        e = Expense.objects.get()
        self.assertEqual(e.date_purchased, timezone.localdate() - timedelta(days=3))
        self.assertEqual(e.created_by, self.admin)
        self.assertEqual(CashFlow.objects.count(), 0)  # Expense is the single source of truth

    def test_invalid_expenses_are_rejected(self):
        tomorrow = str(timezone.localdate() + timedelta(days=1))
        cases = {
            'zero amount': {'amount': '0'},
            'negative amount': {'amount': '-5'},
            'junk amount': {'amount': 'abc'},
            'unknown category': {'category': 'Snacks'},
            'unknown shop': {'shop': 'warehouse'},
            'future date': {'date_purchased': tomorrow},
            'blank description': {'description': ''},
        }
        for label, over in cases.items():
            self.assertEqual(self._post(**over).status_code, 400, label)
        self.assertEqual(Expense.objects.count(), 0)

    def test_shared_expenses_have_no_shop_and_all_listed_categories_are_accepted(self):
        for category in ['Beauty Products', 'Fashion (Clothes)', 'Fashion (Handbags)', 'Rent', 'Electricity',
                         'Water', 'Equipment', 'Salaries', 'Other']:
            r = self._post(category=category, shop='')
            self.assertEqual(r.status_code, 201, (category, r.content))
            self.assertIsNone(r.json()['shop'])

    def test_only_admins_can_use_the_expense_api(self):
        member = User.objects.create_user(username='member', password='pass')
        client = APIClient()
        client.force_authenticate(member)
        self.assertEqual(client.post('/api/admin/expenses/', {'description': 'x', 'amount': '1'}, format='json').status_code, 403)
        self.assertEqual(client.get('/api/admin/expenses/').status_code, 403)

    def test_list_filters_by_shop_category_and_dates_with_a_total(self):
        d = lambda n: str(timezone.localdate() - timedelta(days=n))
        self._post(description='Serums', amount='1000', category='Beauty Products', shop='beauty', date_purchased=d(1))
        self._post(description='Jackets', amount='2000', shop='fashion', date_purchased=d(5))
        self._post(description='Rent Oct', amount='30000', category='Rent', shop='', date_purchased=d(9))

        def listing(**params):
            r = self.client.get('/api/admin/expenses/', params)
            self.assertEqual(r.status_code, 200)
            return r.json()

        everything = listing()
        self.assertEqual([e['description'] for e in everything['results']], ['Serums', 'Jackets', 'Rent Oct'])  # newest purchase first
        self.assertEqual(everything['total'], '33000.00')
        self.assertEqual(everything['count'], 3)

        self.assertEqual([e['description'] for e in listing(shop='beauty')['results']], ['Serums'])
        self.assertEqual([e['description'] for e in listing(shop='shared')['results']], ['Rent Oct'])
        self.assertEqual([e['description'] for e in listing(category='Rent')['results']], ['Rent Oct'])
        self.assertEqual([e['description'] for e in listing(date_from=d(6), date_to=d(2))['results']], ['Jackets'])
        self.assertEqual(listing(shop='fashion')['total'], '2000.00')

    # --- edit / delete with audit trail ------------------------------------------------------------------
    def _make(self, **over):
        return self._post(**over).json()['id']

    def test_editing_an_expense_updates_it_and_writes_a_permanent_audit_entry(self):
        pk = self._make()
        r = self.client.patch(f'/api/admin/expenses/{pk}/', {'amount': '42000', 'note': 'counted 48 pcs'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()['amount'], '42000.00')

        entry = AuditEntry.objects.get()
        self.assertEqual((entry.kind, entry.object_ref, entry.action), ('expense', pk, 'edit'))
        self.assertEqual(entry.actor, self.admin)
        self.assertEqual(entry.actor_username, 'admin')
        self.assertEqual(entry.before['amount'], '45000.00')
        self.assertEqual(entry.after['amount'], '42000.00')
        self.assertEqual(entry.before['note'], '50 pcs')
        self.assertEqual(entry.after['note'], 'counted 48 pcs')
        self.assertEqual(entry.object_label, 'Jacket bale')

    def test_an_edit_that_changes_nothing_writes_no_audit_entry(self):
        pk = self._make()
        self.client.patch(f'/api/admin/expenses/{pk}/', {'amount': '45000', 'note': '50 pcs'}, format='json')
        self.assertEqual(AuditEntry.objects.count(), 0)

    def test_deleting_an_expense_keeps_a_snapshot_in_the_audit_trail(self):
        pk = self._make()
        self.assertEqual(self.client.delete(f'/api/admin/expenses/{pk}/').status_code, 204)
        self.assertFalse(Expense.objects.filter(pk=pk).exists())
        entry = AuditEntry.objects.get()
        self.assertEqual((entry.action, entry.object_ref, entry.after), ('delete', pk, None))
        self.assertEqual(entry.before['amount'], '45000.00')
        self.admin.delete()
        entry.refresh_from_db()
        self.assertEqual(entry.actor_username, 'admin')  # survives the actor being deleted

    def test_old_rows_can_be_edited_without_changing_their_legacy_category(self):
        legacy = Expense.objects.create(description='Stock purchase: Serum', amount=Decimal('900'),
                                        category='Stock Purchase', shop='beauty', created_by=self.admin)
        r = self.client.patch(f'/api/admin/expenses/{legacy.id}/', {'amount': '950'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.client.patch(f'/api/admin/expenses/{legacy.id}/', {'category': 'Snacks'}, format='json').status_code, 400)

    def test_edit_and_delete_are_admin_only_and_404_when_missing(self):
        pk = self._make()
        member = User.objects.create_user(username='member', password='pass')
        other = APIClient()
        other.force_authenticate(member)
        self.assertEqual(other.patch(f'/api/admin/expenses/{pk}/', {'amount': '1'}, format='json').status_code, 403)
        self.assertEqual(other.delete(f'/api/admin/expenses/{pk}/').status_code, 403)
        self.assertEqual(self.client.patch('/api/admin/expenses/99999/', {'amount': '1'}, format='json').status_code, 404)

    def test_audit_history_for_an_expense_is_readable_by_admins_newest_first(self):
        pk = self._make()
        self.client.patch(f'/api/admin/expenses/{pk}/', {'amount': '40000'}, format='json')
        self.client.patch(f'/api/admin/expenses/{pk}/', {'amount': '41000'}, format='json')
        rows = self.client.get('/api/admin/audit/', {'kind': 'expense', 'ref': pk}).json()
        self.assertEqual([r['after']['amount'] for r in rows], ['41000.00', '40000.00'])
        self.assertEqual(rows[0]['actor_username'], 'admin')
        member = User.objects.create_user(username='member', password='pass')
        other = APIClient()
        other.force_authenticate(member)
        self.assertEqual(other.get('/api/admin/audit/', {'kind': 'expense', 'ref': pk}).status_code, 403)

    def test_expense_actions_appear_in_the_activity_log_with_readable_labels(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        from app1.models import ActivityLog
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(self.admin).access_token}')
        r = client.post('/api/admin/expenses/', {'description': 'Rent', 'amount': '30000', 'category': 'Rent'}, format='json')
        pk = r.json()['id']
        client.patch(f'/api/admin/expenses/{pk}/', {'amount': '31000'}, format='json')
        client.delete(f'/api/admin/expenses/{pk}/')
        labels = set(ActivityLog.objects.filter(event='action').values_list('detail', flat=True))
        self.assertTrue({'Recorded an expense', 'Edited an expense', 'Deleted an expense'} <= labels, labels)


class PendingExpenseTest(TestCase):
    """A variable bill (electricity) is posted with no amount; it must not count until the amount is entered."""

    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.pending = Expense.objects.create(description='Electricity', amount=None, category='Electricity',
                                              shop=None, created_by=self.admin)
        Expense.objects.create(description='Rent', amount=Decimal('30000'), category='Rent', created_by=self.admin)

    def test_pending_entries_stay_out_of_every_analytics_total(self):
        self.assertEqual(sales_summary('month')['expenses'], Decimal('30000'))
        self.assertEqual([r['description'] for r in transactions('expense', 'month')['rows']], ['Rent'])
        self.assertEqual({b['category'] for b in expenses_breakdown('month')}, {'Rent'})
        self.assertEqual(sum(b['expenses'] for b in cash_flow_trend('month')), Decimal('30000'))

    def test_list_shows_pending_rows_flagged_and_excludes_them_from_the_total(self):
        body = self.client.get('/api/admin/expenses/').json()
        by_desc = {e['description']: e for e in body['results']}
        self.assertTrue(by_desc['Electricity']['is_pending'])
        self.assertIsNone(by_desc['Electricity']['amount'])
        self.assertFalse(by_desc['Rent']['is_pending'])
        self.assertEqual(body['total'], '30000.00')
        self.assertEqual(body['pending_count'], 1)

    def test_entering_the_bill_amount_makes_it_count(self):
        r = self.client.patch(f'/api/admin/expenses/{self.pending.id}/', {'amount': '4500'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(r.json()['is_pending'])
        self.assertEqual(sales_summary('month')['expenses'], Decimal('34500'))
        self.assertEqual(self.client.get('/api/admin/expenses/').json()['pending_count'], 0)

    def test_a_normal_expense_cannot_be_created_or_edited_without_an_amount(self):
        r = self.client.post('/api/admin/expenses/', {'description': 'No amount', 'category': 'Other'}, format='json')
        self.assertEqual(r.status_code, 400)
        rent = Expense.objects.get(description='Rent')
        r = self.client.patch(f'/api/admin/expenses/{rent.id}/', {'amount': None}, format='json')
        self.assertEqual(r.status_code, 400)


class RecurringTemplateAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.url = '/api/admin/recurring-expenses/'

    def _post(self, **over):
        data = {'name': 'Monthly rent', 'category': 'Rent', 'shop': '', 'kind': 'fixed', 'amount': '30000'}
        data.update(over)
        return self.client.post(self.url, data, format='json')

    def test_creating_a_template_posts_this_months_entry_straight_away(self):
        r = self._post()
        self.assertEqual(r.status_code, 201, r.content)
        e = Expense.objects.get()
        self.assertEqual((e.description, e.amount, e.recurring_id), ('Monthly rent', Decimal('30000'), r.json()['id']))
        self.assertEqual(e.date_purchased, timezone.localdate().replace(day=1))

    def test_opening_the_expenses_list_posts_whatever_is_due_and_never_twice(self):
        t = RecurringExpense.objects.create(name='Water', category='Water', kind='fixed', amount=Decimal('1200'),
                                            start_date=timezone.localdate().replace(day=1), created_by=self.admin)
        for _ in range(3):
            body = self.client.get('/api/admin/expenses/').json()
        self.assertEqual([e['description'] for e in body['results']], ['Water'])
        self.assertEqual(Expense.objects.filter(recurring=t).count(), 1)

    def test_fixed_needs_a_positive_amount_and_variable_ignores_any_amount(self):
        self.assertEqual(self._post(amount='').status_code, 400)
        self.assertEqual(self._post(amount='0').status_code, 400)
        r = self._post(name='Electricity', category='Electricity', kind='variable', amount='999')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertIsNone(r.json()['amount'])
        self.assertIsNone(Expense.objects.get(description='Electricity').amount)  # posts awaiting its bill

    def test_invalid_templates_are_rejected(self):
        for label, over in {'bad category': {'category': 'Snacks'}, 'bad kind': {'kind': 'weekly'},
                            'bad shop': {'shop': 'warehouse'}, 'blank name': {'name': ''}}.items():
            self.assertEqual(self._post(**over).status_code, 400, label)
        self.assertEqual(RecurringExpense.objects.count(), 0)

    def test_templates_can_be_listed_paused_edited_and_deleted_with_an_audit_trail(self):
        pk = self._post().json()['id']
        self.assertEqual([t['name'] for t in self.client.get(self.url).json()], ['Monthly rent'])

        r = self.client.patch(f'{self.url}{pk}/', {'amount': '32000', 'active': False}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        edit = AuditEntry.objects.get(kind='recurring_expense', action='edit')
        self.assertEqual((edit.before['amount'], edit.after['amount']), ('30000.00', '32000.00'))
        self.assertEqual((edit.before['active'], edit.after['active']), (True, False))

        self.assertEqual(self.client.delete(f'{self.url}{pk}/').status_code, 204)
        self.assertTrue(AuditEntry.objects.filter(kind='recurring_expense', action='delete', object_ref=pk).exists())
        self.assertEqual(Expense.objects.count(), 1)  # what it already posted stays

    def test_only_admins_manage_templates(self):
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='member', password='pass'))
        self.assertEqual(other.get(self.url).status_code, 403)
        self.assertEqual(other.post(self.url, {'name': 'x'}, format='json').status_code, 403)

    def test_the_dashboard_summary_includes_this_months_rent_even_if_nobody_opened_expenses(self):
        RecurringExpense.objects.create(name='Rent', category='Rent', kind='fixed', amount=Decimal('30000'),
                                        start_date=timezone.localdate().replace(day=1), created_by=self.admin)
        body = self.client.get('/api/admin/analytics/summary/', {'period': 'year'}).json()
        self.assertEqual(Decimal(str(body['expenses'])), Decimal('30000'))
