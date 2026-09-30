from django.db import migrations


def forwards(apps, schema_editor):
    ClothesCategory = apps.get_model('app1', 'ClothesCategory')
    CashFlow = apps.get_model('app1', 'CashFlow')
    GalleryImage = apps.get_model('app1', 'GalleryImage')
    Expense = apps.get_model('app1', 'Expense')
    Product = apps.get_model('app1', 'Product')

    # Fashion clothes categories.
    for order, name in enumerate(['Men', 'Women', 'Kids']):
        ClothesCategory.objects.get_or_create(
            slug=name.lower(), defaults={'name': name, 'sort_order': order},
        )

    # Kenrish Luxury is gone: drop its revenue rows and gallery entries so they
    # can't skew analytics or show up in a shop that no longer exists.
    CashFlow.objects.filter(shop='luxury').delete()
    GalleryImage.objects.filter(shop='luxury').delete()

    # Best-effort attribution of pre-existing stock-purchase expenses to a shop.
    # Descriptions look like "Stock purchase: <name> (Qty: n)".
    beauty_names = set(Product.objects.values_list('name', flat=True))
    for exp in Expense.objects.filter(category='Stock Purchase', shop__isnull=True):
        name = exp.description.removeprefix('Stock purchase: ').rsplit(' (Qty:', 1)[0]
        exp.shop = 'beauty' if name in beauty_names else 'fashion'
        exp.save(update_fields=['shop'])


class Migration(migrations.Migration):

    dependencies = [
        ('app1', '0040_fashion_categories_service_sales_remove_luxury'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
