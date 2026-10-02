from django.core.management.base import BaseCommand

from app1.customers import backfill_sale_customers


class Command(BaseCommand):
    help = 'Link existing product and service sales to customers by phone. Safe to run repeatedly.'

    def handle(self, *args, **options):
        self.stdout.write(f'Linked {backfill_sale_customers()} sale(s) to customers.')
