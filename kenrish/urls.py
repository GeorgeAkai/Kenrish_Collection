"""
URL configuration for kenrish project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

# =========================
# Core Imports
# =========================
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# =========================
# App Imports (Views)
# NOTE: All imported items are referenced below; kept as-is to preserve behavior.
# =========================
from app1.views import (
    home, RegisterView, LoginView, LogoutView, PasswordChangeView, PasswordResetView, PasswordResetDoneView, PasswordResetConfirmView, admin_product_view, add_product, edit_product, delete_product, about, ProductDetailView, user_login_list, user_wishlist, add_to_wishlist, remove_from_wishlist, admin_view_all_wishlists, admin_user_wishlist, wishlist_checkout,
    handbags_list, handbag_detail,
    AddHandbagView, EditHandbagView, DeleteHandbagView, add_handbag_to_wishlist, remove_handbag_from_wishlist, admin_handbag_view, services, add_service, edit_service, gallery, add_gallery_image, edit_gallery_image, delete_gallery_image, offers, add_offer, delete_offer, remove_admin, promote_to_admin, toggle_gallery_like
)

# =========================
# URL Patterns
# Grouped by feature area for quick scanning.
# Order preserved exactly as provided.
# =========================
urlpatterns = [
    # ---------- Public: Home & Content ----------
    path("", home, name="home"),                             # Home page
    path("about/", about, name="about"),                     # About page
    path('product/<int:product_id>/',                        # Product detail (CBV)
         ProductDetailView.as_view(), name='product-detail'),

    # ---------- Auth: Registration & Session ----------
    path("signup/", RegisterView.as_view(), name="signup"),  # Register
    path("login/", LoginView.as_view(), name="login"),       # Login
    path("logout/", LogoutView.as_view(), name="logout"),    # Logout
    path("change-password/",                                # Password change (auth required in view)
         PasswordChangeView.as_view(), name="change-password"),
    
    # ---------- Auth: Password Reset Flow ----------
    path("password-reset/", PasswordResetView.as_view(), name="password_reset"),
    path("password-reset/done/", PasswordResetDoneView.as_view(), name="password_reset_done"),
    path("password-reset/confirm/<str:uidb64>/<str:token>/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

    # ---------- Wishlist: User & Admin ----------
    path('wishlist/', user_wishlist, name='user-wishlist'),                                  # User wishlist
    path('admin/wishlists/', admin_view_all_wishlists, name='admin-user-wishlists'),         # Admin: all wishlists
    path('wishlist/add/<int:product_id>/', add_to_wishlist, name='add-to-wishlist'),         # Add product to wishlist
    path('wishlist/remove/<int:product_id>/', remove_from_wishlist, name='remove-from-wishlist'),  # Remove product
    path('wishlist/checkout/', wishlist_checkout, name='wishlist-checkout'),                 # Checkout summary
    path('wishlist/add-handbag/<int:handbag_id>/', add_handbag_to_wishlist, name='add-handbag-to-wishlist'),  # Add handbag

    # ---------- Admin: Product Management ----------
    # (Access control enforced in views via staff checks)
    path("manage/products/", admin_product_view, name="admin-product"),
    path("manage/products/add/", add_product, name="add-product"),
    path("manage/products/edit/<int:product_id>/", edit_product, name="edit-product"),
    path("manage/products/delete/<int:product_id>/", delete_product, name="delete-product"),
    path('manage/user-login-list/', user_login_list, name='admin_user_logins'),               # Admin: user login stats
    path("manage/user/<int:user_id>/wishlist/", admin_user_wishlist, name="admin_user_wishlist"),  # Admin: specific user's wishlist

    # ---------- Public: Handbags ----------
    path('handbags/', handbags_list, name='handbags'),
    path('handbags/<int:handbag_id>/', handbag_detail, name='handbag-detail'),

    # ---------- Admin: Handbag Management ----------
    # (Access control enforced in views)
    path('manage/handbags/add/', AddHandbagView.as_view(), name='add-handbag'),
    path('manage/handbags/edit/<int:handbag_id>/', EditHandbagView.as_view(), name='edit-handbag'),
    path('manage/handbags/delete/<int:handbag_id>/', DeleteHandbagView.as_view(), name='delete-handbag'),
    path("manage/handbags/", admin_handbag_view, name="admin-handbag"),
    path('manage/remove-admin/<int:user_id>/', remove_admin, name='remove-admin'),           # Admin: remove admin
    path('manage/promote-admin/', promote_to_admin, name='promote-to-admin'),                # Admin: promote admin

    # ---------- Django Admin & Integrations ----------
    path("admin/", admin.site.urls),                        # Django Admin Panel
    path("chatbot/", include("chatbot.urls")),              # Chatbot app routes
    path('wishlist/remove-handbag/<int:handbag_id>/',       # Wishlist: remove handbag
         remove_handbag_from_wishlist, name='remove-handbag-from-wishlist'),

    # ---------- Services ----------
    path('services/', services, name='services'),
    path('service/add/', add_service, name='add-service'),
    path('service/<int:service_id>/edit/', edit_service, name='edit-service'),

    # ---------- Gallery ----------
    path('gallery/', gallery, name='gallery'),
    path('gallery/add/', add_gallery_image, name='add-gallery-image'),
    path('gallery/edit/<int:image_id>/', edit_gallery_image, name='edit-gallery-image'),
    path('gallery/delete/<int:image_id>/', delete_gallery_image, name='delete-gallery-image'),

    # ---------- Offers ----------
    path('offers/', offers, name='offers'),
    path('offers/add/', add_offer, name='add-offer'),
    path('offers/delete/<int:offer_id>/', delete_offer, name='delete-offer'),
]

# =========================
# Static/Media (Dev Only)
# =========================
# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# =========================
# Additional Feature Areas
# Kept after DEBUG block exactly as provided.
# =========================
# Add inventory URLs
from app1.inventory_views import inventory_dashboard, add_stock, record_sale, sales_history, inventory_list, cash_flow, clear_sales_data
from app1.views import privacy_policy, terms_of_service
urlpatterns += [
    # ---------- Inventory ----------
    path('inventory/', inventory_dashboard, name='inventory-dashboard'),
    path('inventory/list/', inventory_list, name='inventory-list'),
    path('inventory/add-stock/', add_stock, name='add-stock'),
    path('inventory/record-sale/', record_sale, name='record-sale'),
    path('inventory/sales-history/', sales_history, name='sales-history'),
    path('inventory/cash-flow/', cash_flow, name='cash-flow'),
    path('inventory/clear-data/', clear_sales_data, name='clear-sales-data'),

    # ---------- Policies ----------
    path('privacy-policy/', privacy_policy, name='privacy-policy'),
    path('terms-of-service/', terms_of_service, name='terms-of-service'),

    # ---------- Social/Interactions ----------
    path("toggle-gallery-like/<int:image_id>/", toggle_gallery_like, name="toggle-gallery-like"),
]
