import json
import os
import random
import string
from datetime import timedelta, date

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.http import StreamingHttpResponse
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.tokens import RefreshToken

from app1.models import (
    Product, Handbag, Clothes,
    Rating, HandbagRating, ClothesRating,
    Wishlist, Service, GalleryImage, GalleryLike, Offer,
    InventoryTransaction, Sale, CashFlow, Expense, UserProfile,
    Invoice, InvoiceItem, Reservation, Order, OrderItem, SlotConfiguration,
    PasswordChangeCode,
)

from app1.inventory import add_stock, record_sale as _record_sale, InsufficientStockError
from chatbot.ai_service import build_system_prompt
from api.analytics import (
    sales_summary as _sales_summary, top_sellers as _top_sellers,
    inventory_alerts as _inventory_alerts, stock_value as _stock_value,
    sales_trend as _sales_trend, cash_flow_trend as _cash_flow_trend,
    expenses_breakdown as _expenses_breakdown,
)

from .serializers import (
    RegisterSerializer, UserSerializer,
    ProductListSerializer, ProductDetailSerializer, ProductAdminSerializer,
    HandbagListSerializer, HandbagDetailSerializer, HandbagAdminSerializer,
    ClothesListSerializer, ClothesDetailSerializer, ClothesAdminSerializer,
    ServiceSerializer, ServiceAdminSerializer,
    GalleryImageSerializer, GalleryAdminSerializer,
    OfferSerializer, OfferAdminSerializer,
    WishlistSerializer, SaleSerializer, ExpenseSerializer,
    AdminUserSerializer,
    InvoiceListSerializer, InvoiceDetailSerializer, InvoiceItemCreateSerializer,
    ReservationSerializer, ReservationAdminSerializer,
    OrderSerializer, OrderCreateSerializer,
    SlotConfigurationSerializer,
    UserProfileSerializer, UserProfileUpdateSerializer,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


def _period_filter(qs, period, date_field='created_at'):
    today = timezone.now().date()
    if period == 'today':
        return qs.filter(**{f'{date_field}__date': today})
    elif period == 'week':
        return qs.filter(**{f'{date_field}__date__gte': today - timedelta(days=7)})
    elif period == 'month':
        return qs.filter(**{f'{date_field}__date__gte': today - timedelta(days=30)})
    return qs


# ---------------------------------------------------------------------------
# Auth endpoints (already existed — keep compatible)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    user = authenticate(
        request,
        username=request.data.get('username'),
        password=request.data.get('password'),
    )
    if user is None:
        return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
    refresh = RefreshToken.for_user(user)
    return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = serializer.save()
    refresh = RefreshToken.for_user(user)
    return Response(
        {'access': str(refresh.access_token), 'refresh': str(refresh), 'user': UserSerializer(user).data},
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_request(request):
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    if not current_password or not new_password:
        return Response({'error': 'Both fields are required.'}, status=400)

    user = authenticate(request, username=request.user.username, password=current_password)
    if user is None:
        return Response({'error': 'Current password is incorrect.'}, status=400)

    if len(new_password) < 8:
        return Response({'error': 'New password must be at least 8 characters.'}, status=400)

    if not user.email:
        return Response({'error': 'No email address on your account.'}, status=400)

    code = ''.join(random.choices(string.digits, k=6))
    expires_at = timezone.now() + timedelta(minutes=10)

    PasswordChangeCode.objects.update_or_create(
        user=user,
        defaults={'code': code, 'new_password': new_password, 'expires_at': expires_at},
    )

    send_mail(
        subject='Kenrish Collection — Password Change Code',
        message=(
            f'Hi {user.username},\n\n'
            f'Your password change verification code is:\n\n'
            f'  {code}\n\n'
            f'This code expires in 10 minutes.\n\n'
            f'If you did not request this, please ignore this email.\n\n'
            f'— Kenrish Collection'
        ),
        from_email=None,
        recipient_list=[user.email],
        fail_silently=False,
    )

    masked = user.email[:2] + '***@' + user.email.split('@')[-1]
    return Response({'message': f'Code sent to {masked}.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_confirm(request):
    code = request.data.get('code', '').strip()
    if not code:
        return Response({'error': 'Code is required.'}, status=400)

    try:
        record = PasswordChangeCode.objects.get(user=request.user)
    except PasswordChangeCode.DoesNotExist:
        return Response({'error': 'No pending password change. Please start over.'}, status=400)

    if record.is_expired():
        record.delete()
        return Response({'error': 'Code has expired. Please start over.'}, status=400)

    if record.code != code:
        return Response({'error': 'Incorrect code.'}, status=400)

    request.user.set_password(record.new_password)
    request.user.save()
    record.delete()
    return Response({'message': 'Password changed successfully. Please log in again.'})


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'GET':
        return Response(UserProfileSerializer(profile, context={'request': request}).data)

    serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(UserProfileSerializer(profile, context={'request': request}).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_account(request):
    user = request.user
    user.is_active = False
    user.save()
    return Response({'message': 'Account deactivated.'}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# 1. Public Catalogue
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
def product_list(request):
    qs = Product.objects.filter(is_published=True).order_by('-id')
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    serializer = ProductListSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def product_detail(request, pk):
    try:
        obj = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ProductDetailSerializer(obj, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def handbag_list(request):
    qs = Handbag.objects.filter(is_published=True).order_by('-id')
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    serializer = HandbagListSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def handbag_detail(request, pk):
    try:
        obj = Handbag.objects.get(pk=pk)
    except Handbag.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(HandbagDetailSerializer(obj, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def clothes_list(request):
    qs = Clothes.objects.filter(is_published=True).order_by('-id')
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    serializer = ClothesListSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def clothes_detail(request, pk):
    try:
        obj = Clothes.objects.get(pk=pk)
    except Clothes.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ClothesDetailSerializer(obj, context={'request': request}).data)


# ---------------------------------------------------------------------------
# 2. Home
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
def home_view(request):
    ctx = {'request': request}
    featured_products = Product.objects.filter(is_published=True).order_by('-is_featured', '-average_rating', '-id')[:8]
    featured_handbags = Handbag.objects.filter(is_published=True).order_by('-average_rating', '-id')[:5]
    featured_clothes = Clothes.objects.filter(is_published=True).order_by('-average_rating', '-id')[:5]
    offers = Offer.objects.all().order_by('-created_at')
    return Response({
        'featured_products': ProductListSerializer(featured_products, many=True, context=ctx).data,
        'featured_handbags': HandbagListSerializer(featured_handbags, many=True, context=ctx).data,
        'featured_clothes': ClothesListSerializer(featured_clothes, many=True, context=ctx).data,
        'offers': OfferSerializer(offers, many=True, context=ctx).data,
    })


# ---------------------------------------------------------------------------
# 3. Services
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
def service_list(request):
    qs = Service.objects.all()
    return Response(ServiceSerializer(qs, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def service_detail(request, pk):
    try:
        obj = Service.objects.get(pk=pk)
    except Service.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(ServiceSerializer(obj, context={'request': request}).data)


# ---------------------------------------------------------------------------
# 4. Gallery
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
def gallery_list(request):
    qs = GalleryImage.objects.all().order_by('-uploaded_at')
    return Response(GalleryImageSerializer(qs, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gallery_like(request, pk):
    try:
        image = GalleryImage.objects.get(pk=pk)
    except GalleryImage.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    like, created = GalleryLike.objects.get_or_create(user=request.user, gallery_image=image)
    if not created:
        like.delete()
        liked = False
    else:
        liked = True
    return Response({'liked': liked, 'like_count': image.likes.count()})


# ---------------------------------------------------------------------------
# 5. Offers
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([AllowAny])
def offer_list(request):
    qs = Offer.objects.all().order_by('-created_at')
    return Response(OfferSerializer(qs, many=True, context={'request': request}).data)


# ---------------------------------------------------------------------------
# 6. Ratings
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rate_product(request, pk):
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    value = request.data.get('value')
    if value is None:
        return Response({'detail': 'value is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        value = int(value)
        if not 1 <= value <= 5:
            raise ValueError
    except (ValueError, TypeError):
        return Response({'detail': 'value must be an integer between 1 and 5.'}, status=status.HTTP_400_BAD_REQUEST)
    rating, _ = Rating.objects.update_or_create(
        product=product, user=request.user,
        defaults={'value': value},
    )
    product.update_average_rating()
    product.refresh_from_db()
    return Response({'average_rating': product.average_rating})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rate_handbag(request, pk):
    try:
        handbag = Handbag.objects.get(pk=pk)
    except Handbag.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    value = request.data.get('rating')
    if value is None:
        return Response({'detail': 'rating is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        value = int(value)
        if not 1 <= value <= 5:
            raise ValueError
    except (ValueError, TypeError):
        return Response({'detail': 'rating must be an integer between 1 and 5.'}, status=status.HTTP_400_BAD_REQUEST)
    rating, _ = HandbagRating.objects.update_or_create(
        handbag=handbag, user=request.user,
        defaults={'rating': value},
    )
    handbag.update_average_rating()
    handbag.refresh_from_db()
    return Response({'average_rating': handbag.average_rating})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rate_clothes(request, pk):
    try:
        clothes = Clothes.objects.get(pk=pk)
    except Clothes.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    value = request.data.get('rating')
    if value is None:
        return Response({'detail': 'rating is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        value = int(value)
        if not 1 <= value <= 5:
            raise ValueError
    except (ValueError, TypeError):
        return Response({'detail': 'rating must be an integer between 1 and 5.'}, status=status.HTTP_400_BAD_REQUEST)
    rating, _ = ClothesRating.objects.update_or_create(
        clothes=clothes, user=request.user,
        defaults={'rating': value},
    )
    clothes.update_average_rating()
    clothes.refresh_from_db()
    return Response({'average_rating': clothes.average_rating})


# ---------------------------------------------------------------------------
# 7. Wishlist
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wishlist_view(request):
    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    return Response(WishlistSerializer(wishlist, context={'request': request}).data)


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def wishlist_product(request, pk):
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        wishlist.products.add(product)
        return Response({'detail': 'Product added to wishlist.'})
    else:
        wishlist.products.remove(product)
        return Response({'detail': 'Product removed from wishlist.'})


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def wishlist_handbag(request, pk):
    try:
        handbag = Handbag.objects.get(pk=pk)
    except Handbag.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        wishlist.handbags.add(handbag)
        return Response({'detail': 'Handbag added to wishlist.'})
    else:
        wishlist.handbags.remove(handbag)
        return Response({'detail': 'Handbag removed from wishlist.'})


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def wishlist_clothes(request, pk):
    try:
        clothes = Clothes.objects.get(pk=pk)
    except Clothes.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    wishlist, _ = Wishlist.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        wishlist.clothes.add(clothes)
        return Response({'detail': 'Clothes added to wishlist.'})
    else:
        wishlist.clothes.remove(clothes)
        return Response({'detail': 'Clothes removed from wishlist.'})


# ---------------------------------------------------------------------------
# 8. Admin Catalogue CRUD
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_product_list(request):
    if request.method == 'GET':
        qs = Product.objects.all().order_by('-id')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(
            ProductDetailSerializer(page, many=True, context={'request': request}).data
        )
    serializer = ProductAdminSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_product_detail(request, pk):
    try:
        obj = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ProductDetailSerializer(obj, context={'request': request}).data)
    elif request.method == 'PATCH':
        serializer = ProductAdminSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
    else:
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_handbag_list(request):
    if request.method == 'GET':
        qs = Handbag.objects.all().order_by('-id')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(
            HandbagDetailSerializer(page, many=True, context={'request': request}).data
        )
    serializer = HandbagAdminSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_handbag_detail(request, pk):
    try:
        obj = Handbag.objects.get(pk=pk)
    except Handbag.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(HandbagDetailSerializer(obj, context={'request': request}).data)
    elif request.method == 'PATCH':
        serializer = HandbagAdminSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
    else:
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_clothes_list(request):
    if request.method == 'GET':
        qs = Clothes.objects.all().order_by('-id')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(
            ClothesDetailSerializer(page, many=True, context={'request': request}).data
        )
    serializer = ClothesAdminSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_clothes_detail(request, pk):
    try:
        obj = Clothes.objects.get(pk=pk)
    except Clothes.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ClothesDetailSerializer(obj, context={'request': request}).data)
    elif request.method == 'PATCH':
        serializer = ClothesAdminSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
    else:
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# 9. Admin Services / Gallery / Offers
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_service_list(request):
    if request.method == 'GET':
        qs = Service.objects.all()
        return Response(ServiceSerializer(qs, many=True, context={'request': request}).data)
    serializer = ServiceAdminSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_service_detail(request, pk):
    try:
        obj = Service.objects.get(pk=pk)
    except Service.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(ServiceSerializer(obj, context={'request': request}).data)
    if request.method == 'DELETE':
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = ServiceAdminSerializer(obj, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_gallery_list(request):
    if request.method == 'GET':
        qs = GalleryImage.objects.all().order_by('-uploaded_at')
        return Response(GalleryImageSerializer(qs, many=True, context={'request': request}).data)
    serializer = GalleryAdminSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_gallery_detail(request, pk):
    try:
        obj = GalleryImage.objects.get(pk=pk)
    except GalleryImage.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(GalleryImageSerializer(obj, context={'request': request}).data)
    elif request.method == 'PATCH':
        serializer = GalleryAdminSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
    else:
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def admin_offer_list(request):
    if request.method == 'GET':
        qs = Offer.objects.all().order_by('-created_at')
        return Response(OfferSerializer(qs, many=True, context={'request': request}).data)
    serializer = OfferAdminSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_offer_delete(request, pk):
    try:
        obj = Offer.objects.get(pk=pk)
    except Offer.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# 10. Admin Inventory
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_inventory_list(request):
    items = []
    for p in Product.objects.all():
        items.append({
            'id': p.id, 'name': p.name, 'item_type': 'product',
            'stock_quantity': p.stock_quantity, 'reorder_level': p.reorder_level,
            'cost_price': p.cost_price, 'price': p.price,
            'is_low_stock': p.is_low_stock, 'inventory_value': p.inventory_value,
        })
    for h in Handbag.objects.all():
        items.append({
            'id': h.id, 'name': h.name, 'item_type': 'handbag',
            'stock_quantity': h.stock_quantity, 'reorder_level': h.reorder_level,
            'cost_price': h.cost_price, 'price': h.price,
            'is_low_stock': h.is_low_stock, 'inventory_value': h.inventory_value,
        })
    for c in Clothes.objects.all():
        items.append({
            'id': c.id, 'name': c.name, 'item_type': 'clothes',
            'stock_quantity': c.stock_quantity, 'reorder_level': c.reorder_level,
            'cost_price': c.cost_price, 'price': c.price,
            'is_low_stock': c.is_low_stock, 'inventory_value': c.inventory_value,
        })
    return Response(items)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_add_stock(request):
    item_type = request.data.get('item_type')
    item_id = request.data.get('item_id')
    quantity = request.data.get('quantity')
    unit_cost = request.data.get('unit_cost', 0)

    if not all([item_type, item_id, quantity]):
        return Response({'detail': 'item_type, item_id, quantity are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        quantity = int(quantity)
        unit_cost = float(unit_cost)
    except (ValueError, TypeError):
        return Response({'detail': 'Invalid quantity or unit_cost.'}, status=status.HTTP_400_BAD_REQUEST)

    if item_type == 'product':
        try:
            item = Product.objects.get(pk=item_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)
    elif item_type == 'handbag':
        try:
            item = Handbag.objects.get(pk=item_id)
        except Handbag.DoesNotExist:
            return Response({'detail': 'Handbag not found.'}, status=status.HTTP_404_NOT_FOUND)
    elif item_type == 'clothes':
        try:
            item = Clothes.objects.get(pk=item_id)
        except Clothes.DoesNotExist:
            return Response({'detail': 'Clothes not found.'}, status=status.HTTP_404_NOT_FOUND)
    else:
        return Response({'detail': 'item_type must be product, handbag, or clothes.'}, status=status.HTTP_400_BAD_REQUEST)

    new_price = request.data.get('new_price')
    notes = request.data.get('notes', '')
    item.cost_price = unit_cost
    add_stock(item, quantity=quantity, unit_cost=unit_cost, actor=request.user,
              notes=notes, new_price=float(new_price) if new_price else None)
    item.refresh_from_db()
    return Response({'detail': f'Added {quantity} units to {item.name}.', 'stock_quantity': item.stock_quantity})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_record_sale(request):
    item_type = request.data.get('item_type')
    item_id = request.data.get('item_id')
    quantity = request.data.get('quantity')
    unit_price = request.data.get('unit_price')
    customer_name = request.data.get('customer_name', '')
    customer_phone = request.data.get('customer_phone', '')

    if not all([item_type, item_id, quantity, unit_price]):
        return Response({'detail': 'item_type, item_id, quantity, unit_price are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        quantity = int(quantity)
        unit_price = float(unit_price)
    except (ValueError, TypeError):
        return Response({'detail': 'Invalid quantity or unit_price.'}, status=status.HTTP_400_BAD_REQUEST)

    if item_type == 'product':
        try:
            item = Product.objects.get(pk=item_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)
    elif item_type == 'handbag':
        try:
            item = Handbag.objects.get(pk=item_id)
        except Handbag.DoesNotExist:
            return Response({'detail': 'Handbag not found.'}, status=status.HTTP_404_NOT_FOUND)
    elif item_type == 'clothes':
        try:
            item = Clothes.objects.get(pk=item_id)
        except Clothes.DoesNotExist:
            return Response({'detail': 'Clothes not found.'}, status=status.HTTP_404_NOT_FOUND)
    else:
        return Response({'detail': 'item_type must be product, handbag, or clothes.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        sale = _record_sale(item, quantity=quantity, unit_price=unit_price, actor=request.user,
                            customer_name=customer_name, customer_phone=customer_phone)
    except InsufficientStockError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_sales_list(request):
    qs = Sale.objects.select_related('product', 'handbag', 'clothes', 'created_by').order_by('-created_at')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    category = request.query_params.get('category')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    if category == 'product':
        qs = qs.filter(product__isnull=False)
    elif category == 'handbag':
        qs = qs.filter(handbag__isnull=False)
    elif category == 'clothes':
        qs = qs.filter(clothes__isnull=False)
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request)
    return paginator.get_paginated_response(SaleSerializer(page, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_add_expense(request):
    description = request.data.get('description')
    amount = request.data.get('amount')
    category = request.data.get('category', 'General')
    if not description or amount is None:
        return Response({'detail': 'description and amount are required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        amount = float(amount)
    except (ValueError, TypeError):
        return Response({'detail': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)
    expense = Expense.objects.create(
        description=description,
        amount=amount,
        category=category,
        created_by=request.user,
    )
    # Also create a CashFlow entry for the expense
    CashFlow.objects.create(
        transaction_type='EXPENSE',
        amount=expense.amount,
        description=expense.description,
        created_by=request.user,
    )
    return Response(ExpenseSerializer(expense).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_cash_flow(request):
    total_revenue = Sale.objects.aggregate(total=Sum('total_amount'))['total'] or 0
    total_expenses = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0
    net = float(total_revenue) - float(total_expenses)
    return Response({
        'total_revenue': total_revenue,
        'total_expenses': total_expenses,
        'net': net,
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_clear_sales(request):
    Sale.objects.all().delete()
    InventoryTransaction.objects.all().delete()
    CashFlow.objects.all().delete()
    Product.objects.all().update(stock_quantity=0)
    Handbag.objects.all().update(stock_quantity=0)
    Clothes.objects.all().update(stock_quantity=0)
    return Response({'detail': 'All sales data cleared and stock reset to 0.'})


# ---------------------------------------------------------------------------
# 11. Admin Users
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_list(request):
    users = User.objects.all().order_by('id')
    return Response(AdminUserSerializer(users, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_user_wishlist(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    wishlist, _ = Wishlist.objects.get_or_create(user=user)
    return Response(WishlistSerializer(wishlist, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_promote_user(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    user.is_staff = True
    user.save()
    return Response({'detail': f'{user.username} promoted to admin.'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_demote_user(request, pk):
    if request.user.pk == pk:
        return Response({'detail': 'Cannot self-demote.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    if user.username == 'GeorgeAkai' and request.user.username != 'GeorgeAkai':
        return Response({'detail': 'GeorgeAkai cannot be removed as admin.'}, status=status.HTTP_403_FORBIDDEN)
    user.is_staff = False
    user.save()
    return Response({'detail': f'{user.username} demoted.'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_all_wishlists(request):
    wishlists = Wishlist.objects.select_related('user').prefetch_related('products', 'handbags', 'clothes').all()
    data = []
    for wl in wishlists:
        data.append({
            'user_id': wl.user.id,
            'username': wl.user.username,
            'products': ProductListSerializer(wl.products.all(), many=True, context={'request': request}).data,
            'handbags': HandbagListSerializer(wl.handbags.all(), many=True, context={'request': request}).data,
            'clothes': ClothesListSerializer(wl.clothes.all(), many=True, context={'request': request}).data,
        })
    return Response(data)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def admin_delete_user(request, pk):
    if request.user.pk == pk:
        return Response({'detail': 'Cannot delete your own account.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    if user.username == 'GeorgeAkai':
        return Response({'detail': 'GeorgeAkai cannot be deleted.'}, status=status.HTTP_403_FORBIDDEN)
    username = user.username
    user.delete()
    return Response({'detail': f'User {username} deleted.'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_wishlist_stats(request):
    products = (Product.objects.annotate(wish_count=Count('wishlisted_by', distinct=True))
                .filter(wish_count__gt=0).order_by('-wish_count')[:10])
    handbags = (Handbag.objects.annotate(wish_count=Count('wishlisted_by', distinct=True))
                .filter(wish_count__gt=0).order_by('-wish_count')[:10])
    clothes_qs = (Clothes.objects.annotate(wish_count=Count('wishlisted_by', distinct=True))
                  .filter(wish_count__gt=0).order_by('-wish_count')[:10])
    items = (
        [{'name': p.name, 'type': 'product', 'wish_count': p.wish_count} for p in products] +
        [{'name': h.name, 'type': 'handbag', 'wish_count': h.wish_count} for h in handbags] +
        [{'name': c.name, 'type': 'clothes', 'wish_count': c.wish_count} for c in clothes_qs]
    )
    items.sort(key=lambda x: x['wish_count'], reverse=True)
    return Response(items[:10])


# ---------------------------------------------------------------------------
# 12. Invoices
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_invoice_list(request):
    if request.method == 'GET':
        qs = Invoice.objects.all().order_by('-created_at')
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        return paginator.get_paginated_response(InvoiceListSerializer(page, many=True).data)

    # POST — create invoice
    customer_name = request.data.get('customer_name')
    customer_phone = request.data.get('customer_phone')
    items_data = request.data.get('items', [])

    if not customer_name or not customer_phone:
        return Response({'detail': 'customer_name and customer_phone are required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not items_data:
        return Response({'detail': 'At least one item is required.'}, status=status.HTTP_400_BAD_REQUEST)

    item_serializers = [InvoiceItemCreateSerializer(data=item) for item in items_data]
    for s in item_serializers:
        if not s.is_valid():
            return Response({'detail': 'Invalid item data.', 'errors': s.errors}, status=status.HTTP_400_BAD_REQUEST)

    invoice = Invoice.objects.create(
        customer_name=customer_name,
        customer_phone=customer_phone,
        created_by=request.user,
        grand_total=0,
    )

    grand_total = 0
    for s in item_serializers:
        d = s.validated_data
        item_type = d['item_type']
        item_id = d['item_id']
        quantity = d['quantity']
        unit_price = d['unit_price']

        product = handbag = clothes = None
        if item_type == 'product':
            try:
                product = Product.objects.get(pk=item_id)
            except Product.DoesNotExist:
                invoice.delete()
                return Response({'detail': f'Product {item_id} not found.'}, status=status.HTTP_404_NOT_FOUND)
        elif item_type == 'handbag':
            try:
                handbag = Handbag.objects.get(pk=item_id)
            except Handbag.DoesNotExist:
                invoice.delete()
                return Response({'detail': f'Handbag {item_id} not found.'}, status=status.HTTP_404_NOT_FOUND)
        elif item_type == 'clothes':
            try:
                clothes = Clothes.objects.get(pk=item_id)
            except Clothes.DoesNotExist:
                invoice.delete()
                return Response({'detail': f'Clothes {item_id} not found.'}, status=status.HTTP_404_NOT_FOUND)

        inv_item = InvoiceItem(
            invoice=invoice,
            item_type=item_type,
            product=product,
            handbag=handbag,
            clothes=clothes,
            quantity=quantity,
            unit_price=unit_price,
            subtotal=0,
        )
        inv_item.save()  # subtotal computed in model.save()
        grand_total += inv_item.subtotal

    invoice.grand_total = grand_total
    invoice.save()

    return Response(InvoiceDetailSerializer(invoice).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_invoice_detail(request, pk):
    try:
        invoice = Invoice.objects.prefetch_related('items').get(pk=pk)
    except Invoice.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(InvoiceDetailSerializer(invoice).data)


# ---------------------------------------------------------------------------
# 13. Analytics
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_summary(request):
    period = request.query_params.get('period', 'month')
    return Response(_sales_summary(period))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_sales_trend(request):
    period = request.query_params.get('period', 'month')
    return Response(_sales_trend(period))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_top_sellers(request):
    period = request.query_params.get('period', 'month')
    sellers = _top_sellers(period)
    products = [s for s in sellers if s['type'] == 'product']
    handbags = [s for s in sellers if s['type'] == 'handbag']
    clothes = [s for s in sellers if s['type'] == 'clothes']
    return Response({'products': products, 'handbags': handbags, 'clothes': clothes})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_inventory_alerts(request):
    return Response(_inventory_alerts())


@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_stock_value(request):
    return Response({'total_value': _stock_value()})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_cash_flow(request):
    period = request.query_params.get('period', 'month')
    return Response(_cash_flow_trend(period))


@api_view(['GET'])
@permission_classes([IsAdminUser])
def analytics_expenses_breakdown(request):
    period = request.query_params.get('period', 'month')
    return Response(_expenses_breakdown(period))


@api_view(['POST'])
@permission_classes([IsAdminUser])
def analytics_reset(request):
    """
    Zero out all analytics data.
    Body: {"save": true}  →  returns snapshot JSON before wiping.
    Body: {"save": false} →  wipes without returning snapshot (Wipe mode).
    """
    do_save = bool(request.data.get('save', False))

    snapshot = None
    if do_save:
        snapshot = {
            'generated_at': timezone.now().isoformat(),
            'summary_today': _sales_summary('today'),
            'summary_week': _sales_summary('week'),
            'summary_month': _sales_summary('month'),
            'top_sellers_month': _top_sellers('month'),
            'expenses_month': _expenses_breakdown('month'),
            'total_stock_value': _stock_value(),
            'total_sales': Sale.objects.count(),
            'total_expenses': Expense.objects.count(),
        }

    sales_del, _ = Sale.objects.all().delete()
    expenses_del, _ = Expense.objects.all().delete()
    cashflow_del, _ = CashFlow.objects.all().delete()

    result = {
        'success': True,
        'deleted': {'sales': sales_del, 'expenses': expenses_del, 'cash_flow': cashflow_del},
    }
    if snapshot:
        result['snapshot'] = snapshot
    return Response(result)


# ---------------------------------------------------------------------------
# 14. Chatbot streaming
# ---------------------------------------------------------------------------

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def chatbot_stream(request):
    messages_data = request.data.get('messages', [])
    if not messages_data:
        return Response({'detail': 'messages is required.'}, status=status.HTTP_400_BAD_REQUEST)

    api_key = os.environ.get('OPENROUTER_API_KEY', '')
    model = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-oss-20b:free')
    # Fallback chain: if primary model is unavailable, try these in order
    fallback_models = [
        model,
        'meta-llama/llama-3.3-70b-instruct:free',
        'meta-llama/llama-3.2-3b-instruct:free',
        'google/gemma-3-12b-it:free',
    ]

    if not api_key:
        return Response({'detail': 'OPENROUTER_API_KEY not configured.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Guardrail: reject messages probing admin/internal paths
    import re as _re
    _admin_pattern = _re.compile(
        r'(/admin|/api/admin|django.admin|admin\s+panel|admin\s+login|staff\s+account'
        r'|system\s+prompt|ignore\s+your|jailbreak|pretend\s+you|act\s+as\s+(a\s+)?different'
        r'|reveal\s+(your|the)\s+(prompt|instructions)|database\s+record)',
        _re.IGNORECASE,
    )
    last_user_msg = next(
        (m.get('content', '') for m in reversed(messages_data) if m.get('role') == 'user'),
        '',
    )
    if _admin_pattern.search(last_user_msg):
        def _blocked():
            msg = json.dumps({'choices': [{'delta': {'content': 'I can only help with shopping and salon services at Kenrish Collection.'}}]})
            yield f'data: {msg}\n\n'
            yield 'data: [DONE]\n\n'
        return StreamingHttpResponse(_blocked(), content_type='text/event-stream')

    products = list(Product.objects.values('name', 'price', 'stock_quantity').order_by('-id')[:20])
    handbags = list(Handbag.objects.values('name', 'price', 'stock_quantity').order_by('-id')[:20])
    clothes = list(Clothes.objects.values('name', 'price', 'stock_quantity').order_by('-id')[:20])
    system_prompt = build_system_prompt(products, handbags, clothes)

    full_messages = [{'role': 'system', 'content': system_prompt}] + list(messages_data)

    def stream_sse():
        import httpx
        or_headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://kenrish.co.ke',
            'X-Title': 'Kenrish Collection Chatbot',
        }
        tried = []
        for attempt_model in dict.fromkeys(fallback_models):  # deduplicate, preserve order
            tried.append(attempt_model)
            try:
                payload = {
                    'model': attempt_model,
                    'messages': full_messages,
                    'stream': True,
                    'max_tokens': 500,
                    'temperature': 0.7,
                }
                got_content = False
                with httpx.stream(
                    'POST',
                    'https://openrouter.ai/api/v1/chat/completions',
                    json=payload,
                    headers=or_headers,
                    timeout=60.0,
                ) as resp:
                    if resp.status_code >= 400:
                        continue  # try next model
                    for line in resp.iter_lines():
                        if not line.startswith('data: '):
                            continue
                        chunk = line[6:]
                        if chunk.strip() == '[DONE]':
                            yield 'data: [DONE]\n\n'
                            got_content = True
                            break
                        try:
                            parsed = json.loads(chunk)
                            if 'error' in parsed:
                                break  # any error from this model → try next
                        except Exception:
                            pass
                        got_content = True
                        yield f'data: {chunk}\n\n'
                if got_content:
                    return
            except Exception:
                continue
        yield f'data: {json.dumps({"error": "All AI models are temporarily unavailable. Please try again shortly."})}\n\n'

    response = StreamingHttpResponse(stream_sse(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


# ---------------------------------------------------------------------------
# Reservations (customer-facing)
# ---------------------------------------------------------------------------

def _slot_config_for(service_id):
    """Return the active SlotConfiguration for a service, or None."""
    if not service_id:
        return None
    try:
        return SlotConfiguration.objects.select_related('service').get(service_id=service_id, is_active=True)
    except SlotConfiguration.DoesNotExist:
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_slots(request):
    """
    Service-aware slot availability using SlotConfiguration when defined.
    Falls back to 30-min generic slots if no config exists for the service.
    Query params: service (int, optional), date (YYYY-MM-DD, required)
    """
    from datetime import datetime as dt
    from collections import Counter

    date_str = request.query_params.get('date')
    service_id = request.query_params.get('service') or None
    if not date_str:
        return Response({'detail': 'date is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        target_date = dt.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'detail': 'Invalid date format.'}, status=status.HTTP_400_BAD_REQUEST)

    cfg = _slot_config_for(service_id)

    if cfg:
        # Day not active → no slots
        if not cfg.is_day_active(target_date):
            return Response([])
        slot_times = cfg.generate_slots(target_date)
        booked_qs = Reservation.objects.filter(
            service_id=service_id,
            reservation_date=target_date,
            status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_APPROVED],
        ).values_list('reservation_time', flat=True)
        counts = Counter(str(t)[:5] for t in booked_qs)
        return Response([
            {
                'time': t,
                'available': counts.get(t, 0) < cfg.worker_count,
                'capacity': cfg.worker_count,
                'booked': counts.get(t, 0),
                'remaining': max(0, cfg.worker_count - counts.get(t, 0)),
            }
            for t in slot_times
        ])
    else:
        # Fallback: 30-min slots, capacity 1
        slots = []
        h, m = 8, 0
        while (h, m) <= (19, 0):
            slots.append(f'{h:02d}:{m:02d}')
            m += 30
            if m == 60:
                h += 1
                m = 0
        qs = Reservation.objects.filter(
            reservation_date=target_date,
            status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_APPROVED],
        )
        if service_id:
            qs = qs.filter(service_id=service_id)
        else:
            qs = qs.filter(service__isnull=True)
        booked = {str(r.reservation_time)[:5] for r in qs}
        return Response([
            {'time': s, 'available': s not in booked, 'capacity': 1, 'booked': 1 if s in booked else 0, 'remaining': 0 if s in booked else 1}
            for s in slots
        ])


@api_view(['GET'])
@permission_classes([AllowAny])
def public_slots(request):
    """
    Capacity-aware public slot view.
    With SlotConfigurations: aggregates available spots across all active services.
    Without: falls back to combined-booking 30-min display (backwards compat).
    """
    from datetime import datetime as dt, date as ddate, datetime, timedelta
    from collections import defaultdict, Counter

    date_str = request.query_params.get('date', '')
    if not date_str:
        return Response({'detail': 'date is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        target_date = dt.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'detail': 'Invalid date format.'}, status=status.HTTP_400_BAD_REQUEST)

    today = ddate.today()
    now_time = datetime.now().time() if target_date == today else None
    weekday = target_date.weekday()

    active_configs = [
        c for c in SlotConfiguration.objects.filter(is_active=True).select_related('service')
        if c.is_day_active(target_date)
    ]

    if not active_configs:
        # Fallback: old behaviour — Sunday closed, 30-min unified slots
        if weekday == 6:
            return Response([])
        slots = []
        h, m = 8, 0
        while (h, m) <= (19, 30):
            slots.append(f'{h:02d}:{m:02d}')
            m += 30
            if m == 60:
                h += 1
                m = 0
        booked_times = {
            str(r.reservation_time)[:5]
            for r in Reservation.objects.filter(
                reservation_date=target_date,
                status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_APPROVED],
            )
        }
        result = []
        for s in slots:
            sh, sm = int(s[:2]), int(s[3:])
            is_past = target_date < today or (
                now_time is not None and (sh * 60 + sm) <= (now_time.hour * 60 + now_time.minute)
            )
            result.append({
                'time': s,
                'available': s not in booked_times and not is_past,
                'booked': s in booked_times,
                'past': is_past,
                'available_spots': 0 if s in booked_times else 1,
                'total_capacity': 1,
            })
        return Response(result)

    # Build booking counts per (service_id, time)
    all_bookings = Reservation.objects.filter(
        reservation_date=target_date,
        status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_APPROVED],
        service__isnull=False,
    ).values('service_id', 'reservation_time')
    booking_counts = defaultdict(Counter)
    for b in all_bookings:
        booking_counts[b['service_id']][str(b['reservation_time'])[:5]] += 1

    # Collect all unique times across configs (use 30-min display resolution)
    all_times = set()
    for cfg in active_configs:
        all_times.update(cfg.generate_slots(target_date))
    sorted_times = sorted(all_times)

    result = []
    for t in sorted_times:
        sh, sm = int(t[:2]), int(t[3:])
        is_past = target_date < today or (
            now_time is not None and (sh * 60 + sm) <= (now_time.hour * 60 + now_time.minute)
        )
        total_cap = 0
        total_booked = 0
        for cfg in active_configs:
            if t in cfg.generate_slots(target_date):
                total_cap += cfg.worker_count
                total_booked += booking_counts[cfg.service_id].get(t, 0)
        available_spots = max(0, total_cap - total_booked)
        result.append({
            'time': t,
            'available': available_spots > 0 and not is_past,
            'booked': available_spots == 0 and total_cap > 0,
            'past': is_past,
            'available_spots': available_spots,
            'total_capacity': total_cap,
        })
    return Response(result)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reservation_list(request):
    """
    GET  – calendar events: approved reservations + caller's own reservations.
    POST – create a new pending reservation for the authenticated user.
    """
    if request.method == 'GET':
        approved = Reservation.objects.filter(status=Reservation.STATUS_APPROVED)
        own = Reservation.objects.filter(customer=request.user)
        qs = (approved | own).distinct().select_related('service', 'customer')
        serializer = ReservationSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    serializer = ReservationSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    d = serializer.validated_data
    service_id = d.get('service').id if d.get('service') else None
    res_date = d['reservation_date']
    res_time = d['reservation_time'].strftime('%H:%M')
    cfg = _slot_config_for(service_id)

    if cfg:
        if not cfg.is_day_active(res_date):
            return Response({'detail': 'This service is not available on that day.'}, status=status.HTTP_400_BAD_REQUEST)
        valid_slots = cfg.generate_slots(res_date)
        if res_time not in valid_slots:
            return Response({'detail': f'Invalid time. Please select a valid slot for {cfg.service.name}.'}, status=status.HTTP_400_BAD_REQUEST)
        from collections import Counter
        counts = Counter(
            str(t)[:5] for t in Reservation.objects.filter(
                service_id=service_id, reservation_date=res_date,
                status__in=[Reservation.STATUS_PENDING, Reservation.STATUS_APPROVED],
            ).values_list('reservation_time', flat=True)
        )
        if counts.get(res_time, 0) >= cfg.worker_count:
            return Response({'detail': 'This slot is fully booked. Please choose another time.'}, status=status.HTTP_400_BAD_REQUEST)

    serializer.save(customer=request.user, status=Reservation.STATUS_PENDING)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_reservations(request):
    qs = Reservation.objects.filter(customer=request.user).select_related('service').order_by('reservation_date', 'reservation_time')
    serializer = ReservationSerializer(qs, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_reservation(request, pk):
    reservation = Reservation.objects.filter(pk=pk, customer=request.user).first()
    if not reservation:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if reservation.status != Reservation.STATUS_PENDING:
        return Response({'detail': 'Only pending reservations can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
    reservation.status = Reservation.STATUS_CANCELLED
    reservation.save()
    return Response({'detail': 'Reservation cancelled.'})


# ---------------------------------------------------------------------------
# Reservations (admin)
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_reservation_list(request):
    if request.method == 'GET':
        status_filter = request.query_params.get('status', '')
        qs = Reservation.objects.select_related('service', 'customer').order_by('reservation_date', 'reservation_time')
        if status_filter:
            qs = qs.filter(status=status_filter)
        serializer = ReservationAdminSerializer(qs, many=True, context={'request': request})
        pending_count = Reservation.objects.filter(status=Reservation.STATUS_PENDING).count()
        return Response({'results': serializer.data, 'pending_count': pending_count})

    serializer = ReservationAdminSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_reservation_detail(request, pk):
    reservation = Reservation.objects.filter(pk=pk).select_related('service', 'customer').first()
    if not reservation:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        reservation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ReservationAdminSerializer(reservation, data=request.data, partial=True, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# Slot Configurations (admin)
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_slot_config_list(request):
    if request.method == 'GET':
        configs = SlotConfiguration.objects.select_related('service').all()
        # Also return services with no config so the UI can offer to create one
        all_services = Service.objects.all()
        configured_ids = set(configs.values_list('service_id', flat=True))
        return Response({
            'configs': SlotConfigurationSerializer(configs, many=True).data,
            'unconfigured_services': [
                {'id': s.id, 'name': s.name}
                for s in all_services if s.id not in configured_ids
            ],
        })
    serializer = SlotConfigurationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    cfg = serializer.save()
    return Response(SlotConfigurationSerializer(cfg).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_slot_config_detail(request, pk):
    try:
        cfg = SlotConfiguration.objects.select_related('service').get(pk=pk)
    except SlotConfiguration.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'GET':
        return Response(SlotConfigurationSerializer(cfg).data)
    if request.method == 'DELETE':
        cfg.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = SlotConfigurationSerializer(cfg, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# Orders (customer)
# ---------------------------------------------------------------------------

def _resolve_item(item_type, item_id):
    """Return the model instance for the given type+id, or None."""
    try:
        if item_type == 'product':
            return Product.objects.get(pk=item_id)
        elif item_type == 'handbag':
            return Handbag.objects.get(pk=item_id)
        elif item_type == 'clothes':
            return Clothes.objects.get(pk=item_id)
    except Exception:
        pass
    return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    serializer = OrderCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    items_data = serializer.validated_data['items']
    notes = serializer.validated_data.get('notes', '')

    if not items_data:
        return Response({'detail': 'Order must contain at least one item.'}, status=status.HTTP_400_BAD_REQUEST)

    from django.db import transaction as db_tx
    from decimal import Decimal

    with db_tx.atomic():
        total = Decimal('0')
        order_items = []
        for d in items_data:
            item = _resolve_item(d['item_type'], d['item_id'])
            if item is None:
                return Response({'detail': f"{d['item_type'].capitalize()} {d['item_id']} not found."}, status=status.HTTP_404_NOT_FOUND)
            subtotal = Decimal(str(d['quantity'])) * d['unit_price']
            total += subtotal
            order_items.append((d, item, subtotal))

        order = Order.objects.create(customer=request.user, notes=notes, total_amount=total)
        for d, item, subtotal in order_items:
            kwargs = {'product': None, 'handbag': None, 'clothes': None}
            kwargs[d['item_type']] = item
            OrderItem.objects.create(
                order=order,
                item_type=d['item_type'],
                item_name=item.name,
                quantity=d['quantity'],
                unit_price=d['unit_price'],
                subtotal=subtotal,
                **kwargs,
            )

    return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    orders = Order.objects.filter(customer=request.user).prefetch_related('items')
    return Response(OrderSerializer(orders, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, pk):
    try:
        order = Order.objects.get(pk=pk, customer=request.user)
    except Order.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if order.status != Order.STATUS_PENDING:
        return Response({'detail': 'Only pending orders can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
    order.status = Order.STATUS_CANCELLED
    order.save()
    return Response(OrderSerializer(order).data)


# ---------------------------------------------------------------------------
# Orders (admin)
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_order_list(request):
    status_filter = request.query_params.get('status', '')
    qs = Order.objects.prefetch_related('items').select_related('customer')
    if status_filter:
        qs = qs.filter(status=status_filter)
    pending_count = Order.objects.filter(status=Order.STATUS_PENDING).count()
    return Response({
        'results': OrderSerializer(qs, many=True).data,
        'pending_count': pending_count,
    })


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def admin_order_detail(request, pk):
    try:
        order = Order.objects.prefetch_related('items').get(pk=pk)
    except Order.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    new_status = request.data.get('status')
    admin_notes = request.data.get('admin_notes', order.admin_notes)

    if new_status and new_status not in dict(Order.STATUS_CHOICES):
        return Response({'detail': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)

    # Confirming an order deducts stock via the inventory module
    if new_status == Order.STATUS_CONFIRMED and order.status == Order.STATUS_PENDING:
        from decimal import Decimal
        errors = []
        for oi in order.items.all():
            item = oi._target_item()
            if item is None:
                continue
            try:
                _record_sale(item, quantity=oi.quantity, unit_price=oi.unit_price, actor=request.user)
            except InsufficientStockError as e:
                errors.append(str(e))
        if errors:
            return Response({'detail': 'Insufficient stock for some items.', 'errors': errors},
                            status=status.HTTP_400_BAD_REQUEST)

    if new_status:
        order.status = new_status
    order.admin_notes = admin_notes
    order.save()
    return Response(OrderSerializer(order).data)


# ---------------------------------------------------------------------------
# 17. Staging (draft products from receipt scan)
# ---------------------------------------------------------------------------

_STAGING_MODEL_MAP = {'product': Product, 'handbag': Handbag, 'clothes': Clothes}
_STAGING_SERIALIZER_MAP = {
    'product': ProductDetailSerializer,
    'handbag': HandbagDetailSerializer,
    'clothes': ClothesDetailSerializer,
}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_staging_list(request):
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    ctx = {'request': request}
    result = []
    for item_type, ModelClass in _STAGING_MODEL_MAP.items():
        qs = ModelClass.objects.filter(is_published=False).order_by('-id')
        serializer = _STAGING_SERIALIZER_MAP[item_type](qs, many=True, context=ctx)
        for item in serializer.data:
            result.append({**item, 'item_type': item_type})
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_staging_publish(request, item_type, pk):
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    ModelClass = _STAGING_MODEL_MAP.get(item_type)
    if not ModelClass:
        return Response({'error': 'Invalid type'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        obj = ModelClass.objects.get(pk=pk, is_published=False)
    except ModelClass.DoesNotExist:
        return Response({'error': 'Draft not found'}, status=status.HTTP_404_NOT_FOUND)

    obj.is_published = True
    obj.save()
    return Response({'status': 'published'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_staging_discard(request, item_type, pk):
    if not request.user.is_staff:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    ModelClass = _STAGING_MODEL_MAP.get(item_type)
    if not ModelClass:
        return Response({'error': 'Invalid type'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        obj = ModelClass.objects.get(pk=pk, is_published=False)
    except ModelClass.DoesNotExist:
        return Response({'error': 'Draft not found'}, status=status.HTTP_404_NOT_FOUND)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
