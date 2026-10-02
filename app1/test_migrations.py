from datetime import datetime, timezone as dt_timezone

from django.contrib.auth.models import User
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class ExpenseDatePurchasedBackfillTest(TransactionTestCase):
    """Migration 0047 must date existing expenses by when they were entered, not by the day it runs."""

    def _migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.migrate([target])
        return executor.loader.project_state([target]).apps

    def tearDown(self):
        # leave the schema at the latest migration for whatever runs next
        MigrationExecutor(connection).migrate(MigrationExecutor(connection).loader.graph.leaf_nodes())

    def test_existing_expenses_keep_their_entry_date(self):
        old_apps = self._migrate(('app1', '0046_price_range'))
        user = old_apps.get_model('auth', 'User').objects.create(username='u')
        Expense = old_apps.get_model('app1', 'Expense')
        e = Expense.objects.create(description='old', amount=100, created_by=user)
        # 2026-03-05 21:30 UTC is already 06 Mar in Nairobi (UTC+3)
        Expense.objects.filter(pk=e.pk).update(created_at=datetime(2026, 3, 5, 21, 30, tzinfo=dt_timezone.utc))

        new_apps = self._migrate(('app1', '0047_expense_date_purchased'))
        self.assertEqual(str(new_apps.get_model('app1', 'Expense').objects.get(pk=e.pk).date_purchased), '2026-03-06')
