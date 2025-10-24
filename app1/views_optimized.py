# Optimized Views for Kenrish Collection
# Replace or merge with your existing views.py

from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib import messages
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.core.cache import cache
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from django.db.models import Q, Avg, Count, Prefetch
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.generic import ListView, DetailView
from django.conf import settings
import logging

from .models import Product, Handbag, Service, GalleryImage, Offer, Wishlist, Rating, HandbagRating
from .forms import ProductForm, HandbagForm, ServiceForm, GalleryImageForm, OfferForm

logger = logging.getLogger(__name__)

# Cache timeout settings
CACHE_TIMEOUT = getattr(settings, 'KENRISH_SETTINGS', {}).get('CACHE_TIMEOUT', {
    'PRODUCTS': 300,
    'GALLERY': 600,
    'SERVICES': 1800,
})

class OptimizedHomeView:
    """Optimized home view with caching and performance improvements"""
    
    @cache_page(CACHE_TIMEOUT['PRODUCTS'])
    @vary_on_headers('User-Agent')
    def home(request):
        # Use select_related and prefetch_related for optimization
        cache_key = 'home_products_featured'
        products = cache.get(cache_key)
        
        if products is None:
            products = Product.objects.select_related().prefetch_related(
                'ratings'
            ).annotate(
                avg_rating=Avg('ratings__value'),
                rating_count=Count('ratings')
            )[:6]  # Limit to 6 featured products
            
            # Cache for 5 minutes
            cache.set(cache_key, products, CACHE_TIMEOUT['PRODUCTS'])
        
        context = {
            'products': products,
            'page_title': 'Home - Kenrish Collection',
            'meta_description': 'Premium beauty salon and cosmetic products in Nakuru City. Discover our range of services and products.',
        }
        
        return render(request, 'home.html', context)

class OptimizedProductViews:
    """Optimized product-related views"""
    
    def product_list(request):
        """Optimized product listing with search and pagination"""
        search_query = request.GET.get('search', '')
        category = request.GET.get('category', '')
        page = request.GET.get('page', 1)
        
        # Create cache key based on parameters
        cache_key = f'products_list_{search_query}_{category}_{page}'
        cached_data = cache.get(cache_key)
        
        if cached_data is None:
            # Optimized queryset with select_related and annotations
            products = Product.objects.select_related().prefetch_related(
                'ratings'
            ).annotate(
                avg_rating=Avg('ratings__value'),
                rating_count=Count('ratings')
            )
            
            # Apply filters
            if search_query:
                products = products.filter(
                    Q(name__icontains=search_query) |
                    Q(description__icontains=search_query)
                )
            
            if category:
                products = products.filter(category=category)
            
            # Pagination
            paginator = Paginator(products, 12)  # 12 products per page
            try:
                products_page = paginator.page(page)
            except PageNotAnInteger:
                products_page = paginator.page(1)
            except EmptyPage:
                products_page = paginator.page(paginator.num_pages)
            
            cached_data = {
                'products': products_page,
                'search_query': search_query,
                'category': category,
            }
            
            # Cache for 5 minutes
            cache.set(cache_key, cached_data, CACHE_TIMEOUT['PRODUCTS'])
        
        context = {
            **cached_data,
            'page_title': 'Products - Kenrish Collection',
            'meta_description': 'Browse our collection of premium beauty and cosmetic products.',
        }
        
        return render(request, 'products.html', context)
    
    def product_detail(request, product_id):
        """Optimized product detail view"""
        cache_key = f'product_detail_{product_id}'
        product_data = cache.get(cache_key)
        
        if product_data is None:
            product = get_object_or_404(
                Product.objects.select_related().prefetch_related(
                    'ratings__user'
                ).annotate(
                    avg_rating=Avg('ratings__value'),
                    rating_count=Count('ratings')
                ),
                id=product_id
            )
            
            # Get related products (same category, excluding current)
            related_products = Product.objects.filter(
                category=product.category
            ).exclude(id=product_id).annotate(
                avg_rating=Avg('ratings__value')
            )[:4]
            
            product_data = {
                'product': product,
                'related_products': related_products,
                'ratings': product.ratings.select_related('user')[:10],  # Latest 10 ratings
            }
            
            # Cache for 10 minutes
            cache.set(cache_key, product_data, 600)
        
        context = {
            **product_data,
            'page_title': f'{product_data["product"].name} - Kenrish Collection',
            'meta_description': product_data["product"].description[:160],
        }
        
        return render(request, 'product_detail.html', context)

class OptimizedGalleryView:
    """Optimized gallery view with lazy loading support"""
    
    @cache_page(CACHE_TIMEOUT['GALLERY'])
    def gallery(request):
        service_filter = request.GET.get('service', '')
        
        cache_key = f'gallery_images_{service_filter}'
        gallery_data = cache.get(cache_key)
        
        if gallery_data is None:
            images = GalleryImage.objects.select_related()
            
            if service_filter:
                images = images.filter(service=service_filter)
            
            images = images.order_by('-uploaded_at')
            
            # Group by service for better organization
            services = GalleryImage.SERVICE_CHOICES
            
            gallery_data = {
                'images': images,
                'services': services,
                'current_service': service_filter,
            }
            
            cache.set(cache_key, gallery_data, CACHE_TIMEOUT['GALLERY'])
        
        context = {
            **gallery_data,
            'page_title': 'Gallery - Kenrish Collection',
            'meta_description': 'View our gallery of beautiful hairdressing, nail care, and beauty services.',
        }
        
        return render(request, 'gallery.html', context)

class OptimizedServiceViews:
    """Optimized service-related views"""
    
    @cache_page(CACHE_TIMEOUT['SERVICES'])
    def services(request):
        cache_key = 'services_list'
        services_data = cache.get(cache_key)
        
        if services_data is None:
            services = Service.objects.annotate(
                avg_rating=Avg('ratings__rating'),
                rating_count=Count('ratings')
            ).order_by('-avg_rating', 'name')
            
            services_data = {'services': services}
            cache.set(cache_key, services_data, CACHE_TIMEOUT['SERVICES'])
        
        context = {
            **services_data,
            'page_title': 'Services - Kenrish Collection',
            'meta_description': 'Professional beauty services including hairdressing, nail care, and more in Nakuru City.',
        }
        
        return render(request, 'services.html', context)

class OptimizedWishlistViews:
    """Optimized wishlist functionality"""
    
    @login_required
    def wishlist(request):
        """Display user's wishlist with optimized queries"""
        cache_key = f'wishlist_{request.user.id}'
        wishlist_data = cache.get(cache_key)
        
        if wishlist_data is None:
            wishlist, created = Wishlist.objects.get_or_create(user=request.user)
            
            # Prefetch related data for better performance
            products = wishlist.products.select_related().annotate(
                avg_rating=Avg('ratings__value')
            )
            
            handbags = wishlist.handbags.select_related().annotate(
                avg_rating=Avg('ratings__rating')
            )
            
            wishlist_data = {
                'wishlist': wishlist,
                'products': products,
                'handbags': handbags,
            }
            
            # Cache for 2 minutes (shorter due to user-specific data)
            cache.set(cache_key, wishlist_data, 120)
        
        context = {
            **wishlist_data,
            'page_title': 'My Wishlist - Kenrish Collection',
        }
        
        return render(request, 'wishlist.html', context)
    
    @login_required
    def add_to_wishlist(request, product_id):
        """AJAX endpoint to add product to wishlist"""
        if request.method == 'POST':
            try:
                product = get_object_or_404(Product, id=product_id)
                wishlist, created = Wishlist.objects.get_or_create(user=request.user)
                
                if product in wishlist.products.all():
                    return JsonResponse({
                        'success': False,
                        'message': 'Product already in wishlist'
                    })
                
                wishlist.products.add(product)
                
                # Clear cache
                cache.delete(f'wishlist_{request.user.id}')
                
                return JsonResponse({
                    'success': True,
                    'message': 'Product added to wishlist'
                })
                
            except Exception as e:
                logger.error(f'Error adding to wishlist: {e}')
                return JsonResponse({
                    'success': False,
                    'message': 'Error adding to wishlist'
                })
        
        return JsonResponse({'success': False, 'message': 'Invalid request'})

class OptimizedSearchView:
    """Optimized search functionality"""
    
    def search(request):
        """Advanced search with caching and performance optimization"""
        query = request.GET.get('q', '').strip()
        category = request.GET.get('category', '')
        min_price = request.GET.get('min_price', '')
        max_price = request.GET.get('max_price', '')
        
        if not query:
            return redirect('home')
        
        # Create cache key
        cache_key = f'search_{query}_{category}_{min_price}_{max_price}'
        search_results = cache.get(cache_key)
        
        if search_results is None:
            # Search products
            products = Product.objects.select_related().prefetch_related(
                'ratings'
            ).annotate(
                avg_rating=Avg('ratings__value'),
                rating_count=Count('ratings')
            )
            
            # Apply search filters
            if query:
                products = products.filter(
                    Q(name__icontains=query) |
                    Q(description__icontains=query)
                )
            
            if category:
                products = products.filter(category=category)
            
            if min_price:
                try:
                    products = products.filter(price__gte=float(min_price))
                except ValueError:
                    pass
            
            if max_price:
                try:
                    products = products.filter(price__lte=float(max_price))
                except ValueError:
                    pass
            
            # Search handbags
            handbags = Handbag.objects.select_related().prefetch_related(
                'ratings'
            ).annotate(
                avg_rating=Avg('ratings__rating'),
                rating_count=Count('ratings')
            )
            
            if query:
                handbags = handbags.filter(
                    Q(name__icontains=query) |
                    Q(description__icontains=query)
                )
            
            # Search services
            services = Service.objects.annotate(
                avg_rating=Avg('ratings__rating')
            )
            
            if query:
                services = services.filter(
                    Q(name__icontains=query) |
                    Q(short_description__icontains=query) |
                    Q(full_description__icontains=query)
                )
            
            search_results = {
                'products': products[:20],  # Limit results
                'handbags': handbags[:20],
                'services': services[:10],
                'query': query,
                'total_results': products.count() + handbags.count() + services.count(),
            }
            
            # Cache for 5 minutes
            cache.set(cache_key, search_results, 300)
        
        context = {
            **search_results,
            'page_title': f'Search Results for "{query}" - Kenrish Collection',
        }
        
        return render(request, 'search_results.html', context)

# Performance monitoring decorator
def monitor_performance(view_func):
    """Decorator to monitor view performance"""
    def wrapper(request, *args, **kwargs):
        import time
        start_time = time.time()
        
        response = view_func(request, *args, **kwargs)
        
        end_time = time.time()
        duration = end_time - start_time
        
        if duration > 1.0:  # Log slow queries (>1 second)
            logger.warning(f'Slow view: {view_func.__name__} took {duration:.2f}s')
        
        return response
    return wrapper

# Apply performance monitoring to views
home = monitor_performance(OptimizedHomeView.home)
product_list = monitor_performance(OptimizedProductViews.product_list)
product_detail = monitor_performance(OptimizedProductViews.product_detail)
gallery = monitor_performance(OptimizedGalleryView.gallery)
services = monitor_performance(OptimizedServiceViews.services)
wishlist = monitor_performance(OptimizedWishlistViews.wishlist)
search = monitor_performance(OptimizedSearchView.search)
