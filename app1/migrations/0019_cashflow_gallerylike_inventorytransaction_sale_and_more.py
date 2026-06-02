# Rewritten: all CreateModel/AddField operations in this file were duplicated by the
# parallel Branch A migrations (0018_handbag_cost_price, 0019_cashflow, 0020_gallerylike).
# Only the cleanup of the superseded Inventory and ProductSaleHistory models is kept.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app1', '0018_productsalehistory_inventory'),
        ('app1', '0020_gallerylike'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='productsalehistory',
            name='product',
        ),
        migrations.RemoveField(
            model_name='productsalehistory',
            name='sold_by',
        ),
        migrations.DeleteModel(
            name='Inventory',
        ),
        migrations.DeleteModel(
            name='ProductSaleHistory',
        ),
    ]
