from django.contrib import admin
from .models import Rating, Service, ClothesCategory, ServiceSale

# Register your models here.
admin.site.register(Rating)
admin.site.register(Service)
admin.site.register(ClothesCategory)
admin.site.register(ServiceSale)
