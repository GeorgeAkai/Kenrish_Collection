from django.contrib.auth.models import User
from rest_framework import serializers

from app1.models import (
    Product, Handbag, Clothes,
    Rating, HandbagRating, ClothesRating,
    Wishlist, Service, GalleryImage, GalleryLike, Offer,
    InventoryTransaction, Sale, CashFlow, Expense, UserProfile,
    Invoice, InvoiceItem, Reservation, Order, OrderItem, SlotConfiguration,
)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
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
        fields = ['id', 'name', 'price', 'image', 'average_rating', 'stock_quantity', 'reorder_level']

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


class HandbagAdminSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False)

    class Meta:
        model = Handbag
        fields = '__all__'
        read_only_fields = ['average_rating', 'created_at', 'updated_at']


# ---------------------------------------------------------------------------
# Clothes
# ---------------------------------------------------------------------------

class ClothesListSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Clothes
        fields = ['id', 'name', 'price', 'image', 'average_rating', 'stock_quantity', 'reorder_level']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ClothesDetailSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Clothes
        fields = '__all__'

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ClothesAdminSerializer(serializers.ModelSerializer):
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
        fields = ['id', 'service', 'file', 'description', 'uploaded_at', 'like_count', 'user_has_liked', 'is_video']

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

    class Meta:
        model = Sale
        fields = [
            'id', 'item_name', 'item_type', 'quantity', 'unit_price',
            'total_amount', 'customer_name', 'customer_phone',
            'created_at', 'created_by_username',
        ]

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
    is_low_stock = serializers.BooleanField()
    inventory_value = serializers.DecimalField(max_digits=14, decimal_places=2)


# ---------------------------------------------------------------------------
# Expense
# ---------------------------------------------------------------------------

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ['id', 'description', 'amount', 'category', 'created_at']
        read_only_fields = ['created_at']


# ---------------------------------------------------------------------------
# Admin Users
# ---------------------------------------------------------------------------

class AdminUserSerializer(serializers.ModelSerializer):
    login_count = serializers.SerializerMethodField()
    added_by = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'date_joined', 'last_login', 'login_count', 'added_by']

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
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)


class OrderCreateSerializer(serializers.Serializer):
    items = OrderCreateItemSerializer(many=True)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
