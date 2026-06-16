from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app1', '0035_service_price_range'),
    ]

    operations = [
        migrations.AlterField(
            model_name='galleryimage',
            name='service',
            field=models.CharField(
                blank=True,
                choices=[
                    ('hairdressing', 'Hairdressing'),
                    ('barber', 'Barber'),
                    ('nails', 'Nails'),
                    ('manicure', 'Manicure'),
                    ('pedicure', 'Pedicure'),
                ],
                max_length=20,
                null=True,
            ),
        ),
    ]
