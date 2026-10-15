import logging

from django.db.models.signals import post_save, pre_save
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import LoginEvent, UserProfile, Reservation, Order, Product, Handbag, Clothes
from . import notify

logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.userprofile.save()

@receiver(user_logged_in)
def increment_login_count(sender, user, request, **kwargs):
    profile, created = UserProfile.objects.get_or_create(user=user)
    profile.login_count += 1
    profile.save()

@receiver(post_save, sender=UserProfile)
def suggest_customer_match(sender, instance, **kwargs):
    from .customers import suggest_walkin_for_profile
    suggest_walkin_for_profile(instance)


@receiver(user_logged_in)
def record_login_event(sender, request, user, **kwargs):
    """Dated, sourced record of each login: the API login (/api/...) is the app; everything else is the website.
    Never raises: a logging problem must not stop anyone signing in."""
    try:
        path = getattr(request, 'path', '') or ''
        LoginEvent.objects.create(user=user, source='app' if path.startswith('/api/') else 'web')
    except Exception:
        logger.exception('Could not record login event')


# ── In-app notifications (app1/notify.py) ──────────────────────────────────
# pre_save remembers the value before the change; post_save compares and notifies.

def _previous(sender, instance, field):
    if not instance.pk:
        return None
    return sender.objects.filter(pk=instance.pk).values_list(field, flat=True).first()


@receiver(pre_save, sender=Reservation)
@receiver(pre_save, sender=Order)
def remember_old_status(sender, instance, **kwargs):
    instance._old_status = _previous(sender, instance, 'status')


@receiver(post_save, sender=Reservation)
def notify_reservation(sender, instance, created, **kwargs):
    if created:
        notify.reservation_created(instance)
    else:
        notify.reservation_status_changed(instance, getattr(instance, '_old_status', None))


@receiver(post_save, sender=Order)
def notify_order(sender, instance, created, **kwargs):
    # A new order is announced from the API once its items exist (see create_order).
    if not created:
        notify.order_status_changed(instance, getattr(instance, '_old_status', None))


@receiver(pre_save, sender=Product)
@receiver(pre_save, sender=Handbag)
@receiver(pre_save, sender=Clothes)
def remember_old_stock(sender, instance, **kwargs):
    instance._old_stock = _previous(sender, instance, 'stock_quantity')


@receiver(post_save, sender=Product)
@receiver(post_save, sender=Handbag)
@receiver(post_save, sender=Clothes)
def notify_stock(sender, instance, created, **kwargs):
    if not created:
        notify.stock_changed(instance, getattr(instance, '_old_stock', None))


@receiver(pre_save, sender=User)
def remember_old_staff(sender, instance, **kwargs):
    instance._was_staff = _previous(sender, instance, 'is_staff')


@receiver(post_save, sender=User)
def notify_staff_added(sender, instance, created, **kwargs):
    if instance.is_staff and not getattr(instance, '_was_staff', False) and not created:
        notify.staff_added(instance)
