from django.db import migrations


def seed_shops_and_assign(apps, schema_editor):
    Shop = apps.get_model('app1', 'Shop')
    Sale = apps.get_model('app1', 'Sale')
    InventoryTransaction = apps.get_model('app1', 'InventoryTransaction')
    CashFlow = apps.get_model('app1', 'CashFlow')
    Expense = apps.get_model('app1', 'Expense')
    Invoice = apps.get_model('app1', 'Invoice')

    beauty = Shop.objects.create(slug='beauty', name='Beauty Shop', description='Salon services and beauty products')
    clothes = Shop.objects.create(slug='clothes', name='Clothes Shop', description='Clothing and handbags')
    Shop.objects.create(slug='luxury', name='Luxury Attire', description='Ladies luxury attire')

    # Assign Sales by product FK
    Sale.objects.filter(product__isnull=False).update(shop=beauty)
    Sale.objects.filter(product__isnull=True).exclude(handbag__isnull=True).update(shop=clothes)
    Sale.objects.filter(product__isnull=True, handbag__isnull=True).exclude(clothes__isnull=True).update(shop=clothes)

    # Assign InventoryTransactions by product FK
    InventoryTransaction.objects.filter(product__isnull=False).update(shop=beauty)
    InventoryTransaction.objects.filter(product__isnull=True).exclude(handbag__isnull=True).update(shop=clothes)
    InventoryTransaction.objects.filter(product__isnull=True, handbag__isnull=True).exclude(clothes__isnull=True).update(shop=clothes)

    # Assign CashFlow — derive from reference_sale.shop when possible, else beauty
    for cf in CashFlow.objects.select_related('reference_sale').all():
        if cf.reference_sale and cf.reference_sale.shop:
            cf.shop = cf.reference_sale.shop
        else:
            cf.shop = beauty
        cf.save(update_fields=['shop'])

    # Expenses and Invoices default to beauty (original business)
    Expense.objects.filter(shop__isnull=True).update(shop=beauty)
    Invoice.objects.filter(shop__isnull=True).update(shop=beauty)


def reverse_assign(apps, schema_editor):
    Shop = apps.get_model('app1', 'Shop')
    Shop.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('app1', '0037_shop_model_and_fks'),
    ]

    operations = [
        migrations.RunPython(seed_shops_and_assign, reverse_assign),
    ]
