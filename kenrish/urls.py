from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static

from app1.views import (
    PasswordResetView, PasswordResetDoneView, PasswordResetConfirmView,
    user_wishlist, add_to_wishlist, remove_from_wishlist, wishlist_checkout,
    admin_view_all_wishlists, admin_user_wishlist,
    add_handbag_to_wishlist, remove_handbag_from_wishlist,
    admin_product_view, add_product, edit_product, delete_product,
    user_login_list,
    AddHandbagView, EditHandbagView, DeleteHandbagView, admin_handbag_view,
    add_gallery_image, edit_gallery_image, delete_gallery_image,
    add_offer, delete_offer,
    add_service, edit_service,
    remove_admin, promote_to_admin,
    toggle_gallery_like,
    admin_clothes, add_clothes_to_wishlist, remove_clothes_from_wishlist,
    admin_reservations, admin_add_reservation, admin_approve_reservation,
)

urlpatterns = [
    # ---------- API ----------
    path('api/', include('api.urls')),

    # ---------- Django admin (renamed so React /admin/* routes reach the catch-all) ----------
    path("django-admin/", admin.site.urls),

    # ---------- Chatbot ----------
    path("chatbot/", include("chatbot.urls")),

    # ---------- Password reset (no React equivalent — needs Django/email) ----------
    path("password-reset/", PasswordResetView.as_view(), name="password_reset"),
    path("password-reset/done/", PasswordResetDoneView.as_view(), name="password_reset_done"),
    path("password-reset/confirm/<str:uidb64>/<str:token>/",
         PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

    # ---------- Wishlist (template-based) ----------
    path('wishlist/', user_wishlist, name='user-wishlist'),
    path('wishlist/add/<int:product_id>/', add_to_wishlist, name='add-to-wishlist'),
    path('wishlist/remove/<int:product_id>/', remove_from_wishlist, name='remove-from-wishlist'),
    path('wishlist/checkout/', wishlist_checkout, name='wishlist-checkout'),
    path('wishlist/add-handbag/<int:handbag_id>/', add_handbag_to_wishlist, name='add-handbag-to-wishlist'),
    path('wishlist/remove-handbag/<int:handbag_id>/', remove_handbag_from_wishlist, name='remove-handbag-from-wishlist'),
    path("clothes/<int:pk>/wishlist/add/", add_clothes_to_wishlist, name="add-clothes-to-wishlist"),
    path("clothes/<int:pk>/wishlist/remove/", remove_clothes_from_wishlist, name="remove-clothes-from-wishlist"),

    # ---------- Legacy Django admin panel (manage/* prefix) ----------
    path("manage/products/", admin_product_view, name="admin-product"),
    path("manage/products/add/", add_product, name="add-product"),
    path("manage/products/edit/<int:product_id>/", edit_product, name="edit-product"),
    path("manage/products/delete/<int:product_id>/", delete_product, name="delete-product"),
    path('manage/user-login-list/', user_login_list, name='admin_user_logins'),
    path("manage/user/<int:user_id>/wishlist/", admin_user_wishlist, name="admin_user_wishlist"),
    path('manage/remove-admin/<int:user_id>/', remove_admin, name='remove-admin'),
    path('manage/promote-admin/', promote_to_admin, name='promote-to-admin'),
    path('manage/handbags/', admin_handbag_view, name="admin-handbag"),
    path('manage/handbags/add/', AddHandbagView.as_view(), name='add-handbag'),
    path('manage/handbags/edit/<int:handbag_id>/', EditHandbagView.as_view(), name='edit-handbag'),
    path('manage/handbags/delete/<int:handbag_id>/', DeleteHandbagView.as_view(), name='delete-handbag'),
    path('manage/reservations/', admin_reservations, name='admin-reservations'),
    path('manage/reservations/add/', admin_add_reservation, name='admin-add-reservation'),
    path('manage/reservations/<int:reservation_id>/action/', admin_approve_reservation, name='admin-approve-reservation'),

    # ---------- Legacy admin sub-paths (explicit, so they resolve before the catch-all) ----------
    path('admin/wishlists/', admin_view_all_wishlists, name='admin-user-wishlists'),
    path('admin/clothes/', admin_clothes, name='admin-clothes'),

    # ---------- Gallery / Offers / Services management actions ----------
    path('gallery/add/', add_gallery_image, name='add-gallery-image'),
    path('gallery/edit/<int:image_id>/', edit_gallery_image, name='edit-gallery-image'),
    path('gallery/delete/<int:image_id>/', delete_gallery_image, name='delete-gallery-image'),
    path('offers/add/', add_offer, name='add-offer'),
    path('offers/delete/<int:offer_id>/', delete_offer, name='delete-offer'),
    path('service/add/', add_service, name='add-service'),
    path('service/<int:service_id>/edit/', edit_service, name='edit-service'),

    # ---------- Social ----------
    path("toggle-gallery-like/<int:image_id>/", toggle_gallery_like, name="toggle-gallery-like"),
]

# ---------- Static/Media (dev only) ----------
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# ---------- Inventory & Policies ----------
from app1.inventory_views import (
    inventory_dashboard, add_stock, record_sale, sales_history,
    inventory_list, cash_flow, clear_sales_data,
)
from app1.views import privacy_policy, terms_of_service

urlpatterns += [
    path('inventory/', inventory_dashboard, name='inventory-dashboard'),
    path('inventory/list/', inventory_list, name='inventory-list'),
    path('inventory/add-stock/', add_stock, name='add-stock'),
    path('inventory/record-sale/', record_sale, name='record-sale'),
    path('inventory/sales-history/', sales_history, name='sales-history'),
    path('inventory/cash-flow/', cash_flow, name='cash-flow'),
    path('inventory/clear-data/', clear_sales_data, name='clear-sales-data'),
    path('privacy-policy/', privacy_policy, name='privacy-policy'),
    path('terms-of-service/', terms_of_service, name='terms-of-service'),
]

# ---------- React SPA catch-all (must be last) ----------
from django.http import FileResponse, HttpResponseNotFound

def react_index(request):
    index = settings.REACT_APP_DIR / 'index.html'
    if index.exists():
        return FileResponse(open(index, 'rb'))
    return HttpResponseNotFound('React build not found.')

# Excludes api/, django-admin/, media/, static/ — everything else goes to React
urlpatterns += [re_path(r'^(?!api/|django-admin/|media/|static/).*$', react_index)]
