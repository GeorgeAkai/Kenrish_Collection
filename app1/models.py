from django.db import models
from django.contrib.auth.models import User
from django.db.models import Avg
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to="product_images/")
    average_rating = models.FloatField(default=0.0)  # ✅ stored field
    is_featured = models.BooleanField(default=False)

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
        self.total_cost = self.quantity * self.unit_cost

        is_new = self.pk is None
        # inventory.add_stock / record_sale set this flag to take ownership of stock adjustment
        skip = getattr(self, '_skip_stock_adjustment', False)
        super().save(*args, **kwargs)

        if is_new and not skip:
            item = self._target_item()
            if item and hasattr(item, 'stock_quantity'):
                if self.transaction_type in ['IN', 'RETURN']:
                    item.stock_quantity = max(0, item.stock_quantity + max(self.quantity, 0))
                elif self.transaction_type in ['OUT', 'SALE']:
                    item.stock_quantity = max(0, item.stock_quantity - max(self.quantity, 0))
                elif self.transaction_type == 'ADJUSTMENT':
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
        # inventory.record_sale sets this flag to take ownership of stock/cashflow handling
        skip = getattr(self, '_skip_stock_adjustment', False)
        super().save(*args, **kwargs)

        if is_new and not skip:
            item = self._target_item()
            if item and hasattr(item, 'stock_quantity'):
                item.stock_quantity = max(0, item.stock_quantity - self.quantity)
                item.save()

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


class Invoice(models.Model):
    invoice_number = models.CharField(max_length=30, unique=True, editable=False)
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=20)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            from datetime import date
            today = date.today().strftime('%Y%m%d')
            count = Invoice.objects.filter(created_at__date=date.today()).count() + 1
            self.invoice_number = f'KRC-{today}-{count:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_number} - {self.customer_name}"

    class Meta:
        ordering = ['-created_at']


class InvoiceItem(models.Model):
    ITEM_TYPES = [('product', 'Product'), ('handbag', 'Handbag'), ('clothes', 'Clothes')]
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=10, choices=ITEM_TYPES)
    product = models.ForeignKey('Product', null=True, blank=True, on_delete=models.SET_NULL)
    handbag = models.ForeignKey('Handbag', null=True, blank=True, on_delete=models.SET_NULL)
    clothes = models.ForeignKey('Clothes', null=True, blank=True, on_delete=models.SET_NULL)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        item = self.product or self.handbag or self.clothes
        name = item.name if item else 'Unknown'
        return f"{self.invoice.invoice_number} - {name} x{self.quantity}"


class SlotConfiguration(models.Model):
    """Per-service booking slot configuration. Controls worker count, duration, and hours."""

    service = models.OneToOneField('Service', on_delete=models.CASCADE, related_name='slot_config')
    worker_count = models.PositiveIntegerField(default=1, help_text='Max simultaneous bookings (= number of workers)')
    slot_duration_minutes = models.PositiveIntegerField(default=30, help_text='Appointment duration in minutes')
    start_time = models.TimeField(default='08:00')
    end_time = models.TimeField(default='20:00')
    # List of weekday ints: 0=Mon … 6=Sun. Empty = all days.
    active_days = models.JSONField(default=list, help_text='Active weekdays (0=Mon, 5=Sat, 6=Sun)')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['service__name']

    def __str__(self):
        return f'{self.service.name} — {self.worker_count} worker(s), {self.slot_duration_minutes}min slots'

    def is_day_active(self, date):
        if not self.active_days:
            return True
        return date.weekday() in self.active_days

    def generate_slots(self, date):
        """Return list of HH:MM strings for a given date according to this config."""
        from datetime import datetime, timedelta
        if not self.is_day_active(date):
            return []
        slots = []
        current = datetime.combine(date, self.start_time)
        end = datetime.combine(date, self.end_time)
        delta = timedelta(minutes=self.slot_duration_minutes)
        while current < end:
            slots.append(current.strftime('%H:%M'))
            current += delta
        return slots


class Order(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_CONFIRMED = 'CONFIRMED'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_CANCELLED = 'CANCELLED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_CONFIRMED, 'Confirmed'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.id} by {self.customer.username} ({self.get_status_display()})'


class OrderItem(models.Model):
    ITEM_TYPES = [('product', 'Product'), ('handbag', 'Handbag'), ('clothes', 'Clothes')]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('Product', null=True, blank=True, on_delete=models.SET_NULL)
    handbag = models.ForeignKey('Handbag', null=True, blank=True, on_delete=models.SET_NULL)
    clothes = models.ForeignKey('Clothes', null=True, blank=True, on_delete=models.SET_NULL)
    item_type = models.CharField(max_length=10, choices=ITEM_TYPES)
    item_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def _target_item(self):
        return self.product or self.handbag or self.clothes

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.item_name} x{self.quantity}'


class Reservation(models.Model):
    STATUS_PENDING = 'PENDING'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'
    STATUS_CANCELLED = 'CANCELLED'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reservations')
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')
    reservation_date = models.DateField()
    reservation_time = models.TimeField()
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    admin_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['reservation_date', 'reservation_time']

    def __str__(self):
        return f"{self.customer.username} - {self.reservation_date} {self.reservation_time} ({self.get_status_display()})"


class PasswordChangeCode(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='pw_change_code')
    code = models.CharField(max_length=6)
    new_password = models.CharField(max_length=255)
    expires_at = models.DateTimeField()

    def is_expired(self):
        return timezone.now() > self.expires_at
