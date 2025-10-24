import os
import json
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from django.test import RequestFactory
from app1.models import Product, Handbag, Service, Offer
from bs4 import BeautifulSoup
import re

class Command(BaseCommand):
    help = 'Crawl website data for chatbot knowledge base'

    def handle(self, *args, **options):
        self.stdout.write('Starting website data crawl...')
        
        # Initialize data structure
        knowledge_base = {
            'products': [],
            'handbags': [],
            'services': [],
            'offers': [],
            'general_info': {}
        }
        
        # Crawl products
        self.stdout.write('Crawling products...')
        for product in Product.objects.all():
            knowledge_base['products'].append({
                'name': product.name,
                'description': product.description,
                'price': str(product.price),
                'category': 'Beauty Product',
                'availability': 'Available' if product.price > 0 else 'Contact for price'
            })
        
        # Crawl handbags
        self.stdout.write('Crawling handbags...')
        for handbag in Handbag.objects.all():
            knowledge_base['handbags'].append({
                'name': handbag.name,
                'description': handbag.description,
                'price': str(handbag.price),
                'category': 'Handbag',
                'availability': 'Available'
            })
        
        # Crawl services
        self.stdout.write('Crawling services...')
        for service in Service.objects.all():
            knowledge_base['services'].append({
                'name': service.name,
                'description': service.full_description or service.short_description,
                'category': 'Beauty Service',
                'location': 'Nakuru City'
            })
        
        # Crawl offers
        self.stdout.write('Crawling offers...')
        for offer in Offer.objects.all():
            knowledge_base['offers'].append({
                'title': offer.title,
                'description': offer.description,
                'category': 'Special Offer'
            })
        
        # Add general business information
        knowledge_base['general_info'] = {
            'business_name': 'Kenrish Collection',
            'location': 'Nakuru City, Kenya',
            'services_offered': [
                'Barbershop services',
                'Hairdressing',
                'Beauty treatments',
                'Nail services',
                'Interior design consultation'
            ],
            'products_offered': [
                'Beauty products',
                'Hair care products',
                'Handbags and accessories',
                'Cosmetics',
                'Personal care items'
            ],
            'business_description': 'Kenrish Collection is a premium beauty and lifestyle destination in Nakuru City, offering professional barbershop, hairdressing, and beauty services alongside a curated collection of beauty products and stylish handbags.',
            'contact_info': 'Visit us in Nakuru City or browse our online collection',
            'specialties': [
                'Professional hair cutting and styling',
                'Beauty treatments and consultations',
                'Quality beauty products',
                'Fashionable handbags and accessories'
            ]
        }
        
        # Save to JSON file
        data_dir = os.path.join('chatbot', 'data')
        os.makedirs(data_dir, exist_ok=True)
        
        with open(os.path.join(data_dir, 'knowledge_base.json'), 'w') as f:
            json.dump(knowledge_base, f, indent=2)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully crawled data:\n'
                f'- {len(knowledge_base["products"])} products\n'
                f'- {len(knowledge_base["handbags"])} handbags\n'
                f'- {len(knowledge_base["services"])} services\n'
                f'- {len(knowledge_base["offers"])} offers'
            )
        )
