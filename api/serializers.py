import re
from django.contrib.auth.models import User
from django.core.validators import validate_email as django_validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from app1.models import (
    Product, Handbag, Clothes,
    Rating, HandbagRating, ClothesRating,
    Wishlist, Service, GalleryImage, GalleryLike, Offer,
    InventoryTransaction, Sale, CashFlow, Expense, UserProfile,
    Invoice, InvoiceItem, Reservation, Order, OrderItem, SlotConfiguration,
    ClothesCategory, ServiceSale, ActivityLog, CustomerReview, SaleEdit, AuditEntry, RecurringExpense, Employee, WEEKDAYS, default_schedule, EXPENSE_CATEGORIES,
)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

_DISPOSABLE_DOMAINS = {
    'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwam.com',
    'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.info',
    'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc',
    'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf', 'moncourrier.fr.nf',
    'monemail.fr.nf', 'monmail.fr.nf', 'trashmail.at', 'trashmail.com', 'trashmail.io',
    'trashmail.me', 'trashmail.net', 'dispostable.com', 'spamgourmet.com', 'spam4.me',
    'spamfree24.org', 'spamfree24.de', 'spamfree24.eu', 'spamfree24.info', 'spamfree24.net',
    'fakeinbox.com', 'mailnull.com', 'maildrop.cc', 'getnada.com', 'mailnesia.com',
}


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def validate_email(self, value):
        value = value.strip().lower()
        # Basic format check
        try:
            django_validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError('Enter a valid email address.')

        # Reject single-segment domains (e.g. user@localhost)
        if not re.search(r'@.+\..+', value):
            raise serializers.ValidationError('Enter a valid email address with a real domain.')

        domain = value.split('@', 1)[1]
        if domain in _DISPOSABLE_DOMAINS:
            raise serializers.ValidationError('Disposable email addresses are not allowed. Please use a real email.')

        # Enforce uniqueness
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')

        return value

    def create(self, validated_data):
        validated_data['email'] = validated_data['email'].strip().lower()
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff']


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

class ProductListSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'image', 'average_rating', 'stock_quantity', 'reorder_level']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ProductAdminSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False)

    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['average_rating', 'created_at', 'updated_at']


# ---------------------------------------------------------------------------
# Handbag
# ---------------------------------------------------------------------------

class HandbagListSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Handbag
        fields = ['id', 'name', 'price', 'max_price', 'image', 'average_rating', 'stock_quantity', 'reorder_level']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class HandbagDetailSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Handbag
        fields = '__all__'

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class PriceRangeValidationMixin:
    """The top of a price range must not be below the bottom (price). Checks the merged result on PATCH."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        price = attrs.get('price', getattr(self.instance, 'price', None))
        max_price = attrs.get('max_price', getattr(self.instance, 'max_price', None))
        if price is not None and max_price is not None and max_price < price:
            raise serializers.ValidationError({'max_price': 'Maximum price cannot be below the price.'})
        return attrs


class HandbagAdminSerializer(PriceRangeValidationMixin, serializers.ModelSerializer):
    image = serializers.ImageField(required=False)

    class Meta:
        model = Handbag
        fields = '__all__'
        read_only_fields = ['average_rating', 'created_at', 'updated_at']


# ---------------------------------------------------------------------------
# Clothes
# ---------------------------------------------------------------------------

class ClothesCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(source='clothes.count', read_only=True)

    class Meta:
        model = ClothesCategory
        fields = ['id', 'name', 'slug', 'sort_order', 'item_count']
        read_only_fields = ['slug']

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Name is required.')
        qs = ClothesCategory.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A category with this name already exists.')
        return value


class ClothesListSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category_slug = serializers.CharField(source='category.slug', read_only=True, default=None)

    class Meta:
        model = Clothes
        fields = ['id', 'name', 'price', 'max_price', 'image', 'average_rating', 'stock_quantity', 'reorder_level',
                  'category', 'category_name', 'category_slug']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ClothesDetailSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    category_slug = serializers.CharField(source='category.slug', read_only=True, default=None)

    class Meta:
        model = Clothes
        fields = '__all__'

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ClothesAdminSerializer(PriceRangeValidationMixin, serializers.ModelSerializer):
    image = serializers.ImageField(required=False)

    class Meta:
        model = Clothes
        fields = '__all__'
        read_only_fields = ['average_rating', 'created_at', 'updated_at']


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class ServiceSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = '__all__'

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ServiceAdminSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False)

    class Meta:
        model = Service
        fields = '__all__'


# ---------------------------------------------------------------------------
# Gallery
# ---------------------------------------------------------------------------

class GalleryImageSerializer(serializers.ModelSerializer):
    file = serializers.SerializerMethodField()
    like_count = serializers.IntegerField(read_only=True)
    user_has_liked = serializers.SerializerMethodField()
    is_video = serializers.SerializerMethodField()

    class Meta:
        model = GalleryImage
        fields = ['id', 'service', 'shop', 'file', 'description', 'uploaded_at', 'like_count', 'user_has_liked', 'is_video']

    def get_file(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_user_has_liked(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_is_video(self, obj):
        return obj.is_video()


class GalleryAdminSerializer(serializers.ModelSerializer):
    file = serializers.FileField(required=False)

    class Meta:
        model = GalleryImage
        fields = '__all__'


# ---------------------------------------------------------------------------
# Offer
# ---------------------------------------------------------------------------

class OfferSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Offer
        fields = '__all__'

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class OfferAdminSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False)

    class Meta:
        model = Offer
        fields = '__all__'


# ---------------------------------------------------------------------------
# Wishlist
# ---------------------------------------------------------------------------

class WishlistSerializer(serializers.ModelSerializer):
    products = ProductListSerializer(many=True, read_only=True)
    handbags = HandbagListSerializer(many=True, read_only=True)
    clothes = ClothesListSerializer(many=True, read_only=True)

    class Meta:
        model = Wishlist
        fields = ['products', 'handbags', 'clothes']


# ---------------------------------------------------------------------------
# Sale
# ---------------------------------------------------------------------------

class SaleSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    item_type = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    edit_count = serializers.SerializerMethodField()
    edited = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id', 'item_name', 'item_type', 'quantity', 'unit_price',
            'total_amount', 'customer_name', 'customer_phone',
            'created_at', 'created_by_username', 'edited', 'edit_count',
        ]

    def get_edit_count(self, obj):
        return obj.edits.count()

    def get_edited(self, obj):
        return obj.edits.exists()

    def get_item_name(self, obj):
        item = obj._target_item()
        return item.name if item else None

    def get_item_type(self, obj):
        if obj.product_id:
            return 'product'
        if obj.handbag_id:
            return 'handbag'
        if obj.clothes_id:
            return 'clothes'
        return None


class AuditEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEntry
        fields = ['id', 'kind', 'object_ref', 'object_label', 'action', 'actor_username', 'before', 'after', 'created_at']


class SaleEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleEdit
        fields = ['id', 'editor_username', 'before', 'after', 'created_at']


# ---------------------------------------------------------------------------
# Inventory item (for admin inventory list)
# ---------------------------------------------------------------------------

class InventoryItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    item_type = serializers.CharField()
    stock_quantity = serializers.IntegerField()
    reorder_level = serializers.IntegerField()
    cost_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    max_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    is_low_stock = serializers.BooleanField()
    inventory_value = serializers.DecimalField(max_digits=14, decimal_places=2)


# ---------------------------------------------------------------------------
# Expense
# ---------------------------------------------------------------------------

class ExpenseSerializer(serializers.ModelSerializer):
    # '' or null both mean a shared cost (no single shop).
    shop = serializers.ChoiceField(choices=['beauty', 'fashion'], allow_null=True, allow_blank=True, required=False)

    is_pending = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = ['id', 'description', 'amount', 'category', 'shop', 'date_purchased', 'note',
                  'is_pending', 'recurring', 'created_at']
        read_only_fields = ['created_at', 'recurring']
        # null in the database means "awaiting the bill"; a person can only ever set a real amount.
        extra_kwargs = {'amount': {'required': True, 'allow_null': False}}

    def get_is_pending(self, obj):
        return obj.amount is None

    def validate_shop(self, value):
        return value or None

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate_category(self, value):
        # An old row (e.g. "Stock Purchase") may keep its category when other fields are edited.
        if value not in EXPENSE_CATEGORIES and not (self.instance and self.instance.category == value):
            raise serializers.ValidationError(f"Category must be one of: {', '.join(EXPENSE_CATEGORIES)}.")
        return value

    def validate_date_purchased(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError('The purchase date cannot be in the future.')
        return value


class RecurringExpenseSerializer(serializers.ModelSerializer):
    shop = serializers.ChoiceField(choices=['beauty', 'fashion'], allow_null=True, allow_blank=True, required=False)

    class Meta:
        model = RecurringExpense
        fields = ['id', 'name', 'category', 'shop', 'kind', 'amount', 'start_date', 'active', 'created_at']
        read_only_fields = ['created_at']

    def validate_shop(self, value):
        return value or None

    def validate_category(self, value):
        if value not in EXPENSE_CATEGORIES:
            raise serializers.ValidationError(f"Category must be one of: {', '.join(EXPENSE_CATEGORIES)}.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        kind = attrs.get('kind', getattr(self.instance, 'kind', 'fixed'))
        if kind == 'variable':
            attrs['amount'] = None  # the bill sets it each month
        else:
            amount = attrs.get('amount', getattr(self.instance, 'amount', None))
            if amount is None or amount <= 0:
                raise serializers.ValidationError({'amount': 'A fixed expense needs an amount greater than zero.'})
        return attrs


_HHMM = re.compile(r'^([01]\d|2[0-3]):[0-5]\d$')


class EmployeeSerializer(serializers.ModelSerializer):
    off_days = serializers.ListField(read_only=True)
    is_active = serializers.SerializerMethodField()
    works_today = serializers.SerializerMethodField()
    schedule = serializers.JSONField(required=False, allow_null=True)

    class Meta:
        model = Employee
        fields = ['id', 'name', 'phone', 'email', 'start_date', 'end_date', 'monthly_salary', 'shop',
                  'schedule', 'off_days', 'is_active', 'works_today', 'created_at']
        read_only_fields = ['created_at']

    def get_is_active(self, obj):
        return obj.is_active_on(timezone.localdate())

    def get_works_today(self, obj):
        today = timezone.localdate()
        return obj.is_active_on(today) and bool(obj.schedule.get(WEEKDAYS[today.weekday()]))

    def validate_phone(self, value):
        if not value:
            return ''
        from app1.customers import normalize_phone
        normalized = normalize_phone(value)
        if not normalized:
            raise serializers.ValidationError('Enter a valid Kenyan mobile number, e.g. 0712 345 678.')
        return normalized

    def validate_monthly_salary(self, value):
        if value <= 0:
            raise serializers.ValidationError('Salary must be greater than zero.')
        return value

    def validate_schedule(self, value):
        if value is None:
            return default_schedule()
        if not isinstance(value, dict) or set(value) - set(WEEKDAYS):
            raise serializers.ValidationError(f"Schedule must be a mapping of weekdays ({', '.join(WEEKDAYS)}) to a shift or null.")
        clean = {}
        for day in WEEKDAYS:
            shift = value.get(day)
            if not shift:
                clean[day] = None
                continue
            start = shift.get('from') if isinstance(shift, dict) else None
            end = shift.get('to') if isinstance(shift, dict) else None
            if not (isinstance(start, str) and isinstance(end, str) and _HHMM.match(start) and _HHMM.match(end)):
                raise serializers.ValidationError(f'{day}: use times like 08:00.')
            if start >= end:
                raise serializers.ValidationError(f'{day}: the shift must end after it starts.')
            clean[day] = {'from': start, 'to': end}
        return clean

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and end < start:
            raise serializers.ValidationError({'end_date': 'The last day cannot be before the start date.'})
        return attrs


# ---------------------------------------------------------------------------
# Service sales (Kenrish Beauty)
# ---------------------------------------------------------------------------

class ServiceSaleSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = ServiceSale
        fields = [
            'id', 'service', 'service_name', 'amount', 'payment_method', 'payment_method_display',
            'customer_name', 'customer_phone', 'notes', 'served_at', 'created_at', 'created_by_username',
        ]
        read_only_fields = ['created_at']
        extra_kwargs = {'service_name': {'required': False}}

    def validate(self, attrs):
        service = attrs.get('service', getattr(self.instance, 'service', None))
        name = attrs.get('service_name') or getattr(self.instance, 'service_name', '')
        if not service and not name:
            raise serializers.ValidationError({'service': 'Pick a service or enter a service name.'})
        if service and not attrs.get('service_name') and 'service' in attrs:
            attrs['service_name'] = service.name
        if attrs.get('amount') is not None and attrs['amount'] <= 0:
            raise serializers.ValidationError({'amount': 'Amount must be greater than zero.'})
        return attrs


# ---------------------------------------------------------------------------
# Admin Users
# ---------------------------------------------------------------------------

class AdminUserSerializer(serializers.ModelSerializer):
    login_count = serializers.SerializerMethodField()
    added_by = serializers.SerializerMethodField()
    has_wishlist = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'date_joined', 'last_login', 'login_count', 'added_by', 'has_wishlist']

    def get_login_count(self, obj):
        try:
            return obj.userprofile.login_count
        except Exception:
            return 0

    def get_added_by(self, obj):
        try:
            added = obj.userprofile.added_by
            return added.username if added else None
        except Exception:
            return None

    def get_has_wishlist(self, obj):
        try:
            wl = obj.wishlist
            return wl.products.exists() or wl.handbags.exists() or wl.clothes.exists()
        except Exception:
            return False


# ---------------------------------------------------------------------------
# Invoice
# ---------------------------------------------------------------------------

class InvoiceItemSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceItem
        fields = ['id', 'item_type', 'item_name', 'quantity', 'unit_price', 'subtotal']

    def get_item_name(self, obj):
        item = obj.product or obj.handbag or obj.clothes
        return item.name if item else None


class InvoiceItemCreateSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=['product', 'handbag', 'clothes'])
    item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)


class InvoiceListSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'customer_name', 'customer_phone', 'created_at', 'grand_total', 'created_by_username']


class InvoiceDetailSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'customer_name', 'customer_phone', 'created_at', 'grand_total', 'created_by_username', 'items']


# ---------------------------------------------------------------------------
# Reservation
# ---------------------------------------------------------------------------

class ReservationSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True, default=None)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'service', 'service_name', 'reservation_date', 'reservation_time',
            'notes', 'status', 'status_display', 'admin_notes', 'customer_username', 'created_at',
        ]
        read_only_fields = ['status', 'admin_notes', 'customer_username', 'created_at']


class ReservationAdminSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True, default=None)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    customer_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Reservation
        fields = [
            'id', 'customer', 'customer_username', 'customer_display',
            'service', 'service_name', 'reservation_date', 'reservation_time',
            'notes', 'status', 'status_display', 'admin_notes', 'created_at',
        ]

    def get_customer_display(self, obj):
        full = obj.customer.get_full_name()
        return full if full else obj.customer.username


# ---------------------------------------------------------------------------
# SlotConfiguration
# ---------------------------------------------------------------------------

class SlotConfigurationSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)

    class Meta:
        model = SlotConfiguration
        fields = [
            'id', 'service', 'service_name', 'worker_count', 'slot_duration_minutes',
            'start_time', 'end_time', 'active_days', 'is_active', 'updated_at',
        ]


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'item_type', 'item_name', 'quantity', 'unit_price', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'customer_username', 'status', 'status_display',
            'total_amount', 'notes', 'admin_notes', 'created_at', 'items',
        ]


class OrderCreateItemSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=['product', 'handbag', 'clothes'])
    item_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)
    # Accepted for older clients but ignored: the server prices every line from the item.
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, write_only=True)


class OrderCreateSerializer(serializers.Serializer):
    items = OrderCreateItemSerializer(many=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


# ---------------------------------------------------------------------------
# User Profile
# ---------------------------------------------------------------------------

class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['username', 'email', 'date_joined', 'avatar', 'bio', 'phone']

    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = UserProfile
        fields = ['avatar', 'bio', 'phone']


# ---------------------------------------------------------------------------
# Activity log
# ---------------------------------------------------------------------------

class ActivityLogSerializer(serializers.ModelSerializer):
    event_display = serializers.CharField(source='get_event_display', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'username', 'event', 'event_display', 'path', 'method', 'status_code',
            'object_type', 'object_id', 'object_name', 'detail', 'ip_address', 'user_agent', 'created_at',
        ]


# ---------------------------------------------------------------------------
# Customer reviews (admin-added testimonials)
# ---------------------------------------------------------------------------

class CustomerReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerReview
        fields = ['id', 'customer_name', 'customer_label', 'text', 'rating', 'shop', 'is_published', 'created_at']
        read_only_fields = ['created_at']

    def validate_customer_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('Name is required.')
        return value.strip()

    def validate_text(self, value):
        if not value.strip():
            raise serializers.ValidationError('Review text is required.')
        return value.strip()

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError('Rating must be between 1 and 5.')
        return value

