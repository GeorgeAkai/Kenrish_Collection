from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from app1.models import AuditEntry, Employee, Expense

DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
SHIFT = {'from': '08:00', 'to': '17:00'}


def schedule(off=('sun',)):
    return {d: (None if d in off else SHIFT) for d in DAYS}


class EmployeeAPITest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='pass', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.url = '/api/admin/employees/'

    def _post(self, **over):
        data = {'name': 'Wanjiru Kamau', 'phone': '0712345678', 'email': 'wanjiru@example.com',
                'start_date': str(timezone.localdate() - timedelta(days=60)), 'monthly_salary': '18000',
                'shop': 'beauty', 'schedule': schedule(off=('sun', 'wed'))}
        data.update(over)
        return self.client.post(self.url, data, format='json')

    def test_admin_adds_an_employee_with_a_schedule_and_the_off_days_are_derived(self):
        r = self._post()
        self.assertEqual(r.status_code, 201, r.content)
        body = r.json()
        self.assertEqual(body['phone'], '+254712345678')           # normalized
        self.assertEqual(body['monthly_salary'], '18000.00')
        self.assertEqual(body['off_days'], ['wed', 'sun'])
        self.assertTrue(body['is_active'])
        self.assertEqual(Employee.objects.get().created_by, self.admin)

    def test_a_default_schedule_is_applied_when_none_is_given(self):
        r = self._post(schedule=None)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['off_days'], ['sun'])

    def test_adding_an_employee_posts_this_months_salary_straight_away(self):
        self._post(start_date=str(timezone.localdate() - timedelta(days=400)))  # long-time employee: this month only
        e = Expense.objects.get()
        self.assertEqual((e.category, e.amount), ('Salaries', Decimal('18000.00')))
        self.assertEqual(e.date_purchased, timezone.localdate().replace(day=1))

    def test_invalid_employees_are_rejected(self):
        today = timezone.localdate()
        cases = {
            'blank name': {'name': ''},
            'zero salary': {'monthly_salary': '0'},
            'negative salary': {'monthly_salary': '-1'},
            'end before start': {'end_date': str(today - timedelta(days=90))},
            'unknown shop': {'shop': 'warehouse'},
            'junk phone': {'phone': '12345'},
            'bad email': {'email': 'not-an-email'},
            'unknown weekday': {'schedule': {**schedule(), 'funday': SHIFT}},
            'bad time': {'schedule': {**schedule(), 'mon': {'from': '25:00', 'to': '17:00'}}},
            'shift ends before it starts': {'schedule': {**schedule(), 'mon': {'from': '17:00', 'to': '08:00'}}},
        }
        for label, over in cases.items():
            self.assertEqual(self._post(**over).status_code, 400, label)
        self.assertEqual(Employee.objects.count(), 0)

    def test_phone_and_email_are_optional(self):
        r = self._post(phone='', email='')
        self.assertEqual(r.status_code, 201, r.content)

    def test_list_marks_who_works_today_and_who_is_still_employed(self):
        today = timezone.localdate()
        todays_key = DAYS[today.weekday()]
        self._post(name='Works today', schedule=schedule(off=()))
        self._post(name='Off today', schedule=schedule(off=(todays_key,)))
        self._post(name='Left already', start_date=str(today - timedelta(days=200)), end_date=str(today - timedelta(days=10)),
                   schedule=schedule(off=()))
        rows = {e['name']: e for e in self.client.get(self.url).json()}
        self.assertTrue(rows['Works today']['works_today'])
        self.assertFalse(rows['Off today']['works_today'])
        self.assertFalse(rows['Left already']['is_active'])
        self.assertFalse(rows['Left already']['works_today'])

    def test_dashboard_shows_who_is_on_and_off_today_payroll_and_headcount(self):
        today = timezone.localdate()
        todays_key = DAYS[today.weekday()]
        self._post(name='A', monthly_salary='20000', shop='beauty', schedule=schedule(off=()))
        self._post(name='B', monthly_salary='15000', shop='fashion', schedule=schedule(off=(todays_key,)))
        self._post(name='C', monthly_salary='10000', shop='both', schedule=schedule(off=()))
        self._post(name='Gone', monthly_salary='99999', shop='beauty', start_date=str(today - timedelta(days=200)),
                   end_date=str(today - timedelta(days=5)))
        body = self.client.get(self.url + 'dashboard/').json()
        self.assertEqual({e['name'] for e in body['on_shift_today']}, {'A', 'C'})
        self.assertEqual({e['name'] for e in body['off_today']}, {'B'})
        self.assertEqual(body['total_monthly_payroll'], '45000.00')       # active employees only
        self.assertEqual(body['headcount'], {'beauty': 1, 'fashion': 1, 'both': 1, 'total': 3})
        self.assertEqual(body['on_shift_today'][0]['shift'], SHIFT)

    def test_editing_and_deleting_are_audited_including_salary_changes(self):
        pk = self._post().json()['id']
        r = self.client.patch(f'{self.url}{pk}/', {'monthly_salary': '20000', 'phone': '0799000111'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        entry = AuditEntry.objects.get(kind='employee', action='edit')
        self.assertEqual((entry.before['monthly_salary'], entry.after['monthly_salary']), ('18000.00', '20000.00'))
        self.assertEqual(entry.after['phone'], '+254799000111')
        self.assertEqual(entry.actor, self.admin)

        self.client.patch(f'{self.url}{pk}/', {'monthly_salary': '20000'}, format='json')  # no change
        self.assertEqual(AuditEntry.objects.filter(kind='employee', action='edit').count(), 1)

        self.assertEqual(self.client.delete(f'{self.url}{pk}/').status_code, 204)
        self.assertTrue(AuditEntry.objects.filter(kind='employee', action='delete', object_ref=pk).exists())
        self.assertEqual(Expense.objects.filter(category='Salaries').count(), 1)  # posted salary stays

    def test_ending_employment_marks_them_inactive(self):
        pk = self._post(start_date=str(timezone.localdate() - timedelta(days=400))).json()['id']
        yesterday = timezone.localdate() - timedelta(days=1)
        r = self.client.patch(f'{self.url}{pk}/', {'end_date': str(yesterday)}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertFalse(r.json()['is_active'])

    def test_salary_data_is_admin_only(self):
        pk = self._post().json()['id']
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='member', password='pass'))
        for method, url in [('get', self.url), ('post', self.url), ('get', self.url + 'dashboard/'),
                            ('patch', f'{self.url}{pk}/'), ('delete', f'{self.url}{pk}/')]:
            self.assertEqual(getattr(other, method)(url, {}, format='json').status_code, 403, (method, url))
        self.assertEqual(APIClient().get(self.url).status_code, 401)

    def test_the_dashboard_totals_include_this_months_salaries_without_visiting_employees(self):
        Employee.objects.create(name='Direct', monthly_salary=Decimal('12000'), shop='fashion',
                                start_date=timezone.localdate().replace(day=1), created_by=self.admin)
        body = self.client.get('/api/admin/analytics/summary/', {'period': 'year', 'shop': 'fashion'}).json()
        self.assertEqual(Decimal(str(body['expenses'])), Decimal('12000'))
