from django.db import migrations, models


def copy_price_to_price_from(apps, schema_editor):
    Service = apps.get_model('app1', 'Service')
    Service.objects.filter(price_from__isnull=True, price__isnull=False).update(price_from=models.F('price'))


class Migration(migrations.Migration):

    dependencies = [
        ('app1', '0034_add_is_published_nullable_image'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='price_from',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='service',
            name='price_to',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AlterField(
            model_name='service',
            name='price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.RunPython(copy_price_to_price_from, migrations.RunPython.noop),
    ]
