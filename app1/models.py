from django.db import models
from django.contrib.auth.models import User
from django.db.models import Avg
from django.core.validators import MinValueValidator, MaxValueValidator


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to="product_images/")
    average_rating = models.FloatField(default=0.0)  # ✅ stored field

    # Inventory fields
    stock_quantity = models.PositiveIntegerField(default=0)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    reorder_level = models.PositiveIntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return self.name

    def update_average_rating(self):
        """Calculate and update the average rating of the product"""
        avg_rating = self.ratings.aggregate(Avg('value'))['value__avg']
        self.average_rating = avg_rating if avg_rating is not None else 0.0
        self.save()


# clothes model (now inventory-enabled)
class Clothes(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to="clothes_images/")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Inventory fields
    stock_quantity = models.PositiveIntegerField(default=0)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    reorder_level = models.PositiveIntegerField(default=5)

    # ⭐ Ratings (stored like Product/Handbag)
    average_rating = models.FloatField(default=0.0)

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.reorder_level

    @property
    def inventory_value(self):
        return self.stock_quantity * self.cost_price

    # ⭐ Ratings helpers (like Product/Handbag)
    def update_average_rating(self):
        avg_rating = self.ratings.aggregate(Avg('rating'))['rating__avg']
        self.average_rating = avg_rating if avg_rating is not None else 0.0
        self.save()

    def get_average_rating(self):
        ratings = self.ratings.all()
        if ratings.exists():
            return round(sum(r.rating for r in ratings) / ratings.count(), 1)
        return 0.0


class ClothesRating(models.Model):
    clothes = models.ForeignKey(Clothes, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(
        default=0,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.clothes.update_average_rating()

    def __str__(self):
        return f"{self.clothes.name} - {self.user.username}: {self.rating} stars"


class Rating(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    value = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rate between 1 (worst) and 5 (best)",
        default=0
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # fixed: field is "value", not "rating"
        return f"{self.product.name} - {self.user.username}: {self.value} stars"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    login_count = models.PositiveIntegerField(default=0)
    added_by = models.ForeignKey(User, null=True, blank=True, related_name='added_admins', on_delete=models.SET_NULL)

    def __str__(self):
        return self.user.username


class Wishlist(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wishlist')
    products = models.ManyToManyField(Product, blank=True, related_name='wishlisted_by')
    handbags = models.ManyToManyField('Handbag', blank=True, related_name='wishlisted_by')
    clothes = models.ManyToManyField('Clothes', blank=True, related_name='wishlisted_by')

    def __str__(self):
        return f"{self.user.username}'s Wishlist"


class Handbag(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to="handbag_images/")
    created_at = models.DateTimeField(auto_now_add=True)
    average_rating = models.FloatField(default=0.0)

    # Inventory fields
    stock_quantity = models.PositiveIntegerField(default=0)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    reorder_level = models.PositiveIntegerField(default=5)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return self.name

    def update_average_rating(self):
        avg_rating = self.ratings.aggregate(Avg('rating'))['rating__avg']
        self.average_rating = avg_rating if avg_rating is not None else 0.0
        self.save()

    def get_average_rating(self):
        ratings = self.ratings.all()
        if ratings.exists():
            return round(sum(r.rating for r in ratings) / ratings.count(), 1)
        return 0.0


class HandbagRating(models.Model):
    handbag = models.ForeignKey(Handbag, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.handbag.update_average_rating()


class Service(models.Model):
    name = models.CharField(max_length=255)
    short_description = models.TextField()
    full_description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='services/', null=True, blank=True)
    average_rating = models.FloatField(default=0.0)

    def __str__(self):
        return self.name

    def update_average_rating(self):
        avg_rating = self.ratings.aggregate(Avg('rating'))['rating__avg']
        self.average_rating = avg_rating if avg_rating is not None else 0.0
        self.save()


class GalleryImage(models.Model):
    SERVICE_CHOICES = [
        ('hairdressing', 'Hairdressing'),
        ('barber', 'Barber'),
        ('nails', 'Nails'),
        ('manicure', 'Manicure'),
        ('pedicure', 'Pedicure'),
    ]
    service = models.CharField(max_length=20, choices=SERVICE_CHOICES)
    file = models.FileField(upload_to='gallery/', null=True, blank=True)
    description = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def is_image(self):
        return self.file and self.file.name and self.file.name.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'))

    def is_video(self):
        return self.file and self.file.name and self.file.name.lower().endswith(('.mp4', '.mov', '.avi', '.webm', '.mkv'))

    def __str__(self):
        return f"{self.get_service_display()} - {self.description[:30]}"

    @property
    def like_count(self):
        return self.likes.count()

    def is_liked_by(self, user):
        if user.is_authenticated:
            return self.likes.filter(user=user).exists()
        return False


class Offer(models.Model):
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to='offers/')
    description = models.TextField()
    offer_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class InventoryTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
        ('SALE', 'Sale'),
        ('RETURN', 'Return'),
        ('ADJUSTMENT', 'Adjustment'),  # treat quantity as delta (+/-)
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    handbag = models.ForeignKey(Handbag, on_delete=models.CASCADE, null=True, blank=True)
    clothes = models.ForeignKey(Clothes, on_delete=models.CASCADE, null=True, blank=True)  # ✅ include clothes

    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.IntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def _target_item(self):
        return self.product or self.handbag or self.clothes

    def save(self, *args, **kwargs):
        # compute total cost
        self.total_cost = self.quantity * self.unit_cost

        is_new = self.pk is None
        super().save(*args, **kwargs)

        # Adjust stock only when the transaction is first created
        # NOTE: If you also adjust stock in Sale.save for 'SALE', avoid double-counting by not creating a matching InventoryTransaction.
        if is_new:
            item = self._target_item()
            if item and hasattr(item, 'stock_quantity'):
                if self.transaction_type in ['IN', 'RETURN']:
                    item.stock_quantity = max(0, item.stock_quantity + max(self.quantity, 0))
                elif self.transaction_type in ['OUT', 'SALE']:
                    item.stock_quantity = max(0, item.stock_quantity - max(self.quantity, 0))
                elif self.transaction_type == 'ADJUSTMENT':
                    # treat quantity as delta; can be positive or negative
                    item.stock_quantity = max(0, item.stock_quantity + self.quantity)
                item.save()

    def __str__(self):
        item = self._target_item()
        name = item.name if item else "Unknown"
        return f"{self.get_transaction_type_display()} - {name} ({self.quantity})"


class Sale(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
    handbag = models.ForeignKey(Handbag, on_delete=models.CASCADE, null=True, blank=True)
    clothes = models.ForeignKey(Clothes, on_delete=models.CASCADE, null=True, blank=True)  # ✅ include clothes
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    customer_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def _target_item(self):
        return self.product or self.handbag or self.clothes

    def save(self, *args, **kwargs):
        self.total_amount = self.quantity * self.unit_price
        is_new = self.pk is None
        super().save(*args, **kwargs)

        # Adjust stock on first creation of a sale
        if is_new:
            item = self._target_item()
            if item and hasattr(item, 'stock_quantity'):
                item.stock_quantity = max(0, item.stock_quantity - self.quantity)
                item.save()

            # Create cash flow entry for new sales
            CashFlow.objects.create(
                transaction_type='REVENUE',
                amount=self.total_amount,
                description=f"Sale: {self._target_item().name if self._target_item() else 'Item'} x{self.quantity}",
                reference_sale=self,
                created_by=self.created_by
            )

    def __str__(self):
        item = self._target_item()
        return f"Sale - {(item.name if item else 'Item')} x{self.quantity}"


# Add inventory properties to Product and Handbag models (Clothes defines its own)
def is_low_stock_property(self):
    return hasattr(self, 'stock_quantity') and hasattr(self, 'reorder_level') and self.stock_quantity <= self.reorder_level


def inventory_value_property(self):
    if hasattr(self, 'stock_quantity') and hasattr(self, 'cost_price'):
        return self.stock_quantity * self.cost_price
    return 0


# Attach properties
Product.is_low_stock = property(is_low_stock_property)
Product.inventory_value = property(inventory_value_property)
Handbag.is_low_stock = property(is_low_stock_property)
Handbag.inventory_value = property(inventory_value_property)


class CashFlow(models.Model):
    TRANSACTION_TYPES = [
        ('REVENUE', 'Revenue'),
        ('EXPENSE', 'Expense'),
    ]

    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)
    reference_sale = models.ForeignKey(Sale, on_delete=models.CASCADE, null=True, blank=True)
    reference_transaction = models.ForeignKey(InventoryTransaction, on_delete=models.CASCADE, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_transaction_type_display()} - Ksh {self.amount}"


class GalleryLike(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    gallery_image = models.ForeignKey(GalleryImage, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'gallery_image')

    def __str__(self):
        return f"{self.user.username} likes {self.gallery_image.description[:20]}"


class Expense(models.Model):
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, default='General')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.description} - Ksh {self.amount}"

    class Meta:
        ordering = ['-created_at']
