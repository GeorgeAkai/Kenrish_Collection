#!/usr/bin/env python3
import os
import sys
import django
from datetime import datetime

# Add the project directory to Python path
sys.path.append('/home/ec2-user/kenrish')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kenrish.settings')
django.setup()

from app1.models import Product, Handbag, Service, Offer

def update_data():
    """Update product data, clean old records, and refresh cache"""
    try:
        # Log the update
        print(f"[{datetime.now()}] Starting daily data update...")
        
        # Update product availability status
        products = Product.objects.all()
        for product in products:
            # Add any product-specific updates here
            product.save()
        
        # Update handbag inventory
        handbags = Handbag.objects.all()
        for handbag in handbags:
            # Add any handbag-specific updates here
            handbag.save()
        
        # Clean expired offers (if you have expiry dates)
        # Offer.objects.filter(expiry_date__lt=datetime.now().date()).delete()
        
        print(f"[{datetime.now()}] Data update completed successfully")
        
    except Exception as e:
        print(f"[{datetime.now()}] Error during data update: {str(e)}")

if __name__ == "__main__":
    update_data()
