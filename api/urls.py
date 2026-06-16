from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views, receipt_views

urlpatterns = [
    # --- Auth ---
    path('auth/login/', views.login_view, name='api-login'),
    path('auth/register/', views.register_view, name='api-register'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='api-token-refresh'),
    path('auth/me/', views.me_view, name='api-me'),
    path('auth/change-password/request/', views.change_password_request, name='api-change-password-request'),
    path('auth/change-password/confirm/', views.change_password_confirm, name='api-change-password-confirm'),
    path('profile/', views.profile_view, name='api-profile'),
    path('profile/delete/', views.delete_account, name='api-delete-account'),

    # --- 1. Public Catalogue ---
    path('products/', views.product_list, name='api-product-list'),
    path('products/<int:pk>/', views.product_detail, name='api-product-detail'),
    path('handbags/', views.handbag_list, name='api-handbag-list'),
    path('handbags/<int:pk>/', views.handbag_detail, name='api-handbag-detail'),
    path('clothes/', views.clothes_list, name='api-clothes-list'),
    path('clothes/<int:pk>/', views.clothes_detail, name='api-clothes-detail'),

    # --- 2. Home ---
    path('home/', views.home_view, name='api-home'),

    # --- 3. Services ---
    path('services/', views.service_list, name='api-service-list'),
    path('services/<int:pk>/', views.service_detail, name='api-service-detail'),

    # --- 4. Gallery ---
    path('gallery/', views.gallery_list, name='api-gallery-list'),
    path('gallery/<int:pk>/like/', views.gallery_like, name='api-gallery-like'),

    # --- 5. Offers ---
    path('offers/', views.offer_list, name='api-offer-list'),

    # --- 6. Ratings ---
    path('products/<int:pk>/rate/', views.rate_product, name='api-rate-product'),
    path('handbags/<int:pk>/rate/', views.rate_handbag, name='api-rate-handbag'),
    path('clothes/<int:pk>/rate/', views.rate_clothes, name='api-rate-clothes'),

    # --- 7. Wishlist ---
    path('wishlist/', views.wishlist_view, name='api-wishlist'),
    path('wishlist/products/<int:pk>/', views.wishlist_product, name='api-wishlist-product'),
    path('wishlist/handbags/<int:pk>/', views.wishlist_handbag, name='api-wishlist-handbag'),
    path('wishlist/clothes/<int:pk>/', views.wishlist_clothes, name='api-wishlist-clothes'),

    # --- 8. Admin Catalogue CRUD ---
    path('admin/products/', views.admin_product_list, name='api-admin-product-list'),
    path('admin/products/<int:pk>/', views.admin_product_detail, name='api-admin-product-detail'),
    path('admin/handbags/', views.admin_handbag_list, name='api-admin-handbag-list'),
    path('admin/handbags/<int:pk>/', views.admin_handbag_detail, name='api-admin-handbag-detail'),
    path('admin/clothes/', views.admin_clothes_list, name='api-admin-clothes-list'),
    path('admin/clothes/<int:pk>/', views.admin_clothes_detail, name='api-admin-clothes-detail'),

    # --- 9. Admin Services / Gallery / Offers ---
    path('admin/services/', views.admin_service_list, name='api-admin-service-list'),
    path('admin/services/<int:pk>/', views.admin_service_detail, name='api-admin-service-detail'),
    path('admin/gallery/', views.admin_gallery_list, name='api-admin-gallery-list'),
    path('admin/gallery/<int:pk>/', views.admin_gallery_detail, name='api-admin-gallery-detail'),
    path('admin/offers/', views.admin_offer_list, name='api-admin-offer-list'),
    path('admin/offers/<int:pk>/', views.admin_offer_delete, name='api-admin-offer-delete'),

    # --- 10. Admin Inventory ---
    path('admin/inventory/', views.admin_inventory_list, name='api-admin-inventory'),
    path('admin/inventory/add-stock/', views.admin_add_stock, name='api-admin-add-stock'),
    path('admin/inventory/record-sale/', views.admin_record_sale, name='api-admin-record-sale'),
    path('admin/inventory/sales/', views.admin_sales_list, name='api-admin-sales'),
    path('admin/inventory/clear-sales/', views.admin_clear_sales, name='api-admin-clear-sales'),
    path('admin/expenses/', views.admin_add_expense, name='api-admin-expense'),
    path('admin/cash-flow/', views.admin_cash_flow, name='api-admin-cash-flow'),

    # --- 11. Admin Users ---
    path('admin/users/', views.admin_user_list, name='api-admin-user-list'),
    path('admin/users/<int:pk>/wishlist/', views.admin_user_wishlist, name='api-admin-user-wishlist'),
    path('admin/users/<int:pk>/promote/', views.admin_promote_user, name='api-admin-promote-user'),
    path('admin/users/<int:pk>/demote/', views.admin_demote_user, name='api-admin-demote-user'),
    path('admin/users/<int:pk>/delete/', views.admin_delete_user, name='api-admin-delete-user'),
    path('admin/wishlists/', views.admin_all_wishlists, name='api-admin-wishlists'),
    path('admin/wishlist-stats/', views.admin_wishlist_stats, name='api-admin-wishlist-stats'),

    # --- 12. Invoices ---
    path('admin/invoices/', views.admin_invoice_list, name='api-admin-invoice-list'),
    path('admin/invoices/<int:pk>/', views.admin_invoice_detail, name='api-admin-invoice-detail'),

    # --- 13. Analytics ---
    path('admin/analytics/reset/', views.analytics_reset, name='api-analytics-reset'),
    path('admin/analytics/summary/', views.analytics_summary, name='api-analytics-summary'),
    path('admin/analytics/sales-trend/', views.analytics_sales_trend, name='api-analytics-sales-trend'),
    path('admin/analytics/top-sellers/', views.analytics_top_sellers, name='api-analytics-top-sellers'),
    path('admin/analytics/inventory-alerts/', views.analytics_inventory_alerts, name='api-analytics-inventory-alerts'),
    path('admin/analytics/stock-value/', views.analytics_stock_value, name='api-analytics-stock-value'),
    path('admin/analytics/cash-flow/', views.analytics_cash_flow, name='api-analytics-cash-flow'),
    path('admin/analytics/expenses-breakdown/', views.analytics_expenses_breakdown, name='api-analytics-expenses-breakdown'),

    # --- 14. Chatbot streaming ---
    path('chatbot/stream/', views.chatbot_stream, name='api-chatbot-stream'),

    # --- 15. Reservations ---
    path('reservations/available-slots/', views.available_slots, name='api-available-slots'),
    path('reservations/public-slots/', views.public_slots, name='api-public-slots'),
    path('reservations/', views.reservation_list, name='api-reservation-list'),
    path('reservations/my/', views.my_reservations, name='api-my-reservations'),
    path('reservations/<int:pk>/cancel/', views.cancel_reservation, name='api-cancel-reservation'),
    path('admin/reservations/', views.admin_reservation_list, name='api-admin-reservation-list'),
    path('admin/reservations/<int:pk>/', views.admin_reservation_detail, name='api-admin-reservation-detail'),

    # --- Slot Configurations ---
    path('admin/slot-configs/', views.admin_slot_config_list, name='api-admin-slot-config-list'),
    path('admin/slot-configs/<int:pk>/', views.admin_slot_config_detail, name='api-admin-slot-config-detail'),

    # --- 16. Receipt scanning ---
    path('admin/receipt/parse/', receipt_views.receipt_parse, name='api-admin-receipt-parse'),
    path('admin/receipt/confirm/', receipt_views.receipt_confirm, name='api-admin-receipt-confirm'),

    # --- Orders ---
    path('orders/', views.create_order, name='api-order-create'),
    path('orders/my/', views.my_orders, name='api-my-orders'),
    path('orders/<int:pk>/cancel/', views.cancel_order, name='api-cancel-order'),
    path('admin/orders/', views.admin_order_list, name='api-admin-orders'),
    path('admin/orders/<int:pk>/', views.admin_order_detail, name='api-admin-order-detail'),
]
