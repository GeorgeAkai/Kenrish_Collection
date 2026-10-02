from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase

from .models import LoginEvent


class LoginEventTest(TestCase):
    """Every successful login leaves one dated, sourced event. Refreshes, failures and sign-ups leave none."""

    def setUp(self):
        cache.clear()   # /api/auth/login/ is throttled to 5 a minute; don't spend (or be blocked by) other tests' budget
        self.addCleanup(cache.clear)
        self.user = User.objects.create_user(username='jane', password='pass')

    def _api_login(self, password='pass'):
        return self.client.post('/api/auth/login/', {'username': 'jane', 'password': password}, content_type='application/json')

    def test_a_website_login_records_a_web_event(self):
        self.assertTrue(self.client.login(username='jane', password='pass'))
        event = LoginEvent.objects.get()
        self.assertEqual((event.user, event.source), (self.user, 'web'))

    def test_an_app_login_records_an_app_event_and_still_counts_the_login(self):
        r = self._api_login()
        self.assertEqual(r.status_code, 200)
        event = LoginEvent.objects.get()
        self.assertEqual((event.user, event.source), (self.user, 'app'))
        self.user.userprofile.refresh_from_db()
        self.assertEqual(self.user.userprofile.login_count, 1)

    def test_a_failed_login_a_token_refresh_and_a_sign_up_are_not_logins(self):
        self.assertEqual(self._api_login(password='wrong').status_code, 401)
        self.assertEqual(LoginEvent.objects.count(), 0)

        tokens = self._api_login().json()
        self.assertEqual(LoginEvent.objects.count(), 1)
        refreshed = self.client.post('/api/auth/token/refresh/', {'refresh': tokens['refresh']}, content_type='application/json')
        self.assertEqual(refreshed.status_code, 200)
        self.assertEqual(LoginEvent.objects.count(), 1)

        signed_up = self.client.post('/api/auth/register/', {
            'username': 'newbie', 'email': 'newbie@example.com', 'password': 'Str0ng!Passw0rd', 'password2': 'Str0ng!Passw0rd',
        }, content_type='application/json')
        if signed_up.status_code == 201:   # the sign-up itself must not look like a login
            self.assertEqual(LoginEvent.objects.count(), 1)

    def test_a_problem_writing_the_event_never_blocks_the_login(self):
        with mock.patch('app1.signals.LoginEvent.objects.create', side_effect=RuntimeError('db hiccup')):
            r = self._api_login()
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.json())
        self.user.userprofile.refresh_from_db()
        self.assertEqual(self.user.userprofile.login_count, 1)
