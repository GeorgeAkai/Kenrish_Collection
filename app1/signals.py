import logging

from django.db.models.signals import post_save
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import LoginEvent, UserProfile

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
