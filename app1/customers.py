import re

from django.db import transaction

from .models import Customer, UserProfile

_KE_MOBILE = re.compile(r'^[17]\d{8}$')


def normalize_phone(raw):
    digits = re.sub(r'\D', '', raw or '')
    if digits.startswith('254'):
        digits = digits[3:]
    elif digits.startswith('0'):
        digits = digits[1:]
    return f'+254{digits}' if _KE_MOBILE.match(digits) else None


def resolve_customer(name, phone):
    normalized = normalize_phone(phone)
    if not normalized:
        return None
    customer, _ = Customer.objects.get_or_create(phone=normalized, defaults={'name': name or ''})
    if customer.user_id is None and customer.possible_user_id is None:
        suggest_user_match(customer)
    return customer


def suggest_user_match(customer):
    """Flag a registered user whose profile phone equals the customer's. An admin must confirm the link."""
    # Profile phones are free-text, so compare normalized values (user base is small).
    for profile in UserProfile.objects.exclude(phone='').select_related('user'):
        if normalize_phone(profile.phone) == customer.phone:
            customer.possible_user = profile.user
            customer.save(update_fields=['possible_user'])
            return profile.user
    return None


def confirm_customer_link(customer, user):
    """Admin-confirmed link. If the user already has a customer record, fold this one into it."""
    with transaction.atomic():
        existing = Customer.objects.filter(user=user).exclude(pk=customer.pk).first()
        if existing:
            customer.sales.update(customer=existing)
            customer.service_sales.update(customer=existing)
            customer.delete()
            return existing
        customer.user = user
        customer.possible_user = None
        customer.save(update_fields=['user', 'possible_user'])
        return customer


def suggest_walkin_for_profile(profile):
    """Reverse of suggest_user_match: a profile phone was saved, so flag an unlinked walk-in with that number."""
    normalized = normalize_phone(profile.phone)
    if not normalized:
        return None
    customer = Customer.objects.filter(phone=normalized, user__isnull=True, possible_user__isnull=True).first()
    if customer:
        customer.possible_user = profile.user
        customer.save(update_fields=['possible_user'])
    return customer


def backfill_sale_customers():
    """Link pre-existing sales (customer unset) to customers by phone. Safe to run repeatedly."""
    from .models import Sale, ServiceSale
    linked = 0
    for model in (Sale, ServiceSale):
        for sale in model.objects.filter(customer__isnull=True).exclude(customer_phone=''):
            customer = resolve_customer(sale.customer_name, sale.customer_phone)
            if customer:
                model.objects.filter(pk=sale.pk).update(customer=customer)  # update(): skip save() side effects
                linked += 1
    return linked
