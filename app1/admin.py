from django.contrib import admin
from .models import Rating, Service, LuxuryItem, LuxuryInquiry

# Register your models here.
admin.site.register(Rating)
admin.site.register(Service)
admin.site.register(LuxuryItem)
admin.site.register(LuxuryInquiry)
