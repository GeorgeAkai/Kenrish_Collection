from django.db import migrations


def set_dr_rashel_featured(apps, schema_editor):
    Product = apps.get_model('app1', 'Product')
    Product.objects.filter(name__icontains='dr rashel').update(is_featured=True)


class Migration(migrations.Migration):

    dependencies = [
        ('app1', '0031_add_product_is_featured'),
    ]

    operations = [
        migrations.RunPython(set_dr_rashel_featured, migrations.RunPython.noop),
    ]
