from django.core.management.base import BaseCommand

from app1.notify import run_due_checks


class Command(BaseCommand):
    help = ('Create due in-app notifications: appointment-tomorrow reminders, the morning '
            'low-stock digest, the monthly expense data check, and 30-day cleanup. '
            'Safe to run as often as you like (e.g. hourly from cron).')

    def handle(self, *args, **options):
        run_due_checks(force=True)
        self.stdout.write(self.style.SUCCESS('Notification checks done.'))
