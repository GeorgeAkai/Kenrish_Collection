from django.contrib import admin
from .models import Rating, Service, ClothesCategory, ServiceSale, CustomerReview, Announcement, Notification

# Register your models here.
admin.site.register(Rating)
admin.site.register(Service)
admin.site.register(ClothesCategory)
admin.site.register(ServiceSale)
admin.site.register(CustomerReview)


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('message', 'tone', 'is_active', 'starts_at', 'ends_at')
    list_filter = ('is_active', 'tone')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'kind', 'title', 'priority', 'read_at', 'created_at')
    list_filter = ('kind', 'priority')
    search_fields = ('title', 'user__username')
