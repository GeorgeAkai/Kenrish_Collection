import json
import os
import requests
import time
import re
from django.conf import settings

class KenrishAIService:
    def __init__(self):
        self.api_key = "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"
        self.api_url = "https://openrouter.ai/api/v1/chat/completions"
        self.model = "microsoft/wizardlm-2-8x22b"
        self.knowledge_base = self.load_knowledge_base()
        
    def load_knowledge_base(self):
        try:
            kb_path = os.path.join('chatbot', 'data', 'knowledge_base.json')
            if os.path.exists(kb_path):
                with open(kb_path, 'r') as f:
                    data = json.load(f)
                    return data
        except Exception as e:
            print(f"Error loading knowledge base: {e}")
        return {}
    
    def get_intent(self, user_message):
        """Determine user intent from message"""
        message_lower = user_message.lower().strip()
        
        # Greetings
        if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']):
            return 'greeting'
        
        # Phone/Contact questions
        if any(phrase in message_lower for phrase in ['phone', 'contact', 'call', 'number', 'reach', 'get hold']):
            return 'contact'
        
        # Location questions
        if any(phrase in message_lower for phrase in ['where are you', 'where is', 'location', 'address', 'find you']):
            return 'location'
        
        # Hours questions
        if any(phrase in message_lower for phrase in ['hours', 'time', 'open', 'close', 'when']):
            return 'hours'
        
        # Product search
        if any(word in message_lower for word in ['product', 'buy', 'purchase', 'item', 'sell']):
            return 'products'
        
        # Services
        if any(word in message_lower for word in ['service', 'appointment', 'book', 'salon', 'barber']):
            return 'services'
        
        # Handbags
        if any(word in message_lower for word in ['bag', 'handbag', 'purse']):
            return 'handbags'
        
        # Pricing
        if any(word in message_lower for word in ['price', 'cost', 'expensive', 'cheap', 'how much']):
            return 'pricing'
        
        # Specific product search
        for product in self.knowledge_base.get('products', []):
            product_words = product['name'].lower().split()
            if any(word in message_lower for word in product_words if len(word) > 3):
                return 'specific_product'
        
        return 'general'
    
    def get_fallback_response(self, user_message):
        intent = self.get_intent(user_message)
        message_lower = user_message.lower()
        
        if intent == 'greeting':
            return "👋 Hello! Welcome to Kenrish Collection!\n\nI'm your personal beauty assistant.\n\n✨ What can I help you with today?\n• Beauty products and skincare\n• Professional salon services\n• Stylish handbags\n• Store location and hours\n• Pricing information\n\nFeel free to ask me anything! 😊"

        elif intent == 'contact':
            return "📞 Contact Kenrish Collection\n\n🏢 Phone: 0708440390\n📍 Address: Shabaab, Nakuru, Kenya\n\n🕒 Hours:\n• Monday - Saturday: 8:00 AM - 8:00 PM\n• Sunday: CLOSED\n\nCall us anytime during business hours!"

        elif intent == 'location':
            return "📍 Kenrish Collection Location\n\n🏢 Address: Shabaab, Nakuru, Kenya\n📞 Phone: 0708440390\n\n🕒 Hours:\n• Monday - Saturday: 8:00 AM - 8:00 PM\n• Sunday: CLOSED\n\nWe're conveniently located in Shabaab, Nakuru.\n🚗 Call us if you need directions!"

        elif intent == 'hours':
            return "🕒 Business Hours\n\n• Monday - Saturday: 8:00 AM - 8:00 PM\n• Sunday: CLOSED\n\nWe're open six days a week to serve you!\n\n📞 Call ahead: 0708440390"

        elif intent == 'specific_product':
            # Find the specific product
            for product in self.knowledge_base.get('products', []):
                product_words = product['name'].lower().split()
                if any(word in message_lower for word in product_words if len(word) > 3):
                    return f"✨ {product['name']}\n\n{product['description']}\n\n💰 Price: ${product['price']}\n\n📞 Order: 0708440390\n📍 Shabaab, Nakuru, Kenya"

        elif intent == 'products':
            products = self.knowledge_base.get('products', [])[:4]
            if products:
                response = "🌟 Our Popular Beauty Products\n\n"
                for product in products:
                    response += f"{product['name']} - ${product['price']}\n"
                response += "\n📞 Contact: 0708440390"
                return response

        elif intent == 'handbags':
            handbags = self.knowledge_base.get('handbags', [])[:4]
            if handbags:
                response = "👜 Our Handbag Collection\n\n"
                for handbag in handbags:
                    response += f"{handbag['name']} - ${handbag['price']}\n"
                response += "\n📞 Contact: 0708440390"
                return response

        elif intent == 'services':
            services = self.knowledge_base.get('services', [])
            if services:
                response = "✨ Our Professional Services\n\n"
                for service in services:
                    response += f"{service['name']}\n{service['description']}\n\n"
                response += "📞 Book appointment: 0708440390\n📍 Shabaab, Nakuru, Kenya"
                return response

        elif intent == 'pricing':
            return "💰 Our Pricing Information\n\nBeauty Products: $15 - $200\nHandbags: $25 - $150\nServices: Competitive rates\n\n📞 Get prices: 0708440390"

        # Default response
        return "👋 Welcome to Kenrish Collection!\n\nYour premier beauty destination in Nakuru!\n\nI can help you with:\n✨ Beauty products and skincare\n👜 Handbag recommendations\n💄 Professional salon services\n📍 Store location and directions\n💰 Pricing information\n\n📞 Phone: 0708440390\n📍 Shabaab, Nakuru, Kenya\n🕒 Hours: Mon-Sat 8AM-8PM\n\nWhat would you like to know?"
    
    def get_response(self, user_message, conversation_history=None):
        return self.get_fallback_response(user_message)
    
    def get_streaming_response(self, user_message, conversation_history=None):
        return self.get_response(user_message, conversation_history)
