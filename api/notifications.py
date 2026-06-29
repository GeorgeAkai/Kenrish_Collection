import logging
import os

logger = logging.getLogger(__name__)

ADMIN_PHONE = os.environ.get('ADMIN_PHONE', '+254708440390')


def _normalise_phone(number: str) -> str:
    """Convert 07XXXXXXXX → +2547XXXXXXXX."""
    n = number.strip().replace(' ', '')
    if n.startswith('0') and len(n) == 10:
        return '+254' + n[1:]
    return n


def send_reservation_sms(reservation) -> None:
    """Send an SMS to the admin when a new reservation is created."""
    at_username = os.environ.get('AT_USERNAME')
    at_api_key = os.environ.get('AT_API_KEY')

    if not at_username or not at_api_key:
        logger.warning('Africa\'s Talking credentials not configured — SMS skipped.')
        return

    try:
        import africastalking
        africastalking.initialize(at_username, at_api_key)
        sms = africastalking.SMS

        customer_name = reservation.customer.username
        service_name = reservation.service.name if reservation.service else 'General'
        res_date = reservation.reservation_date.strftime('%d %b %Y')
        res_time = reservation.reservation_time.strftime('%I:%M %p')

        message = (
            f"[Kenrish Collection] New Booking!\n"
            f"Customer: {customer_name}\n"
            f"Service: {service_name}\n"
            f"Date: {res_date} at {res_time}"
        )

        recipient = _normalise_phone(ADMIN_PHONE)
        sms.send(message, [recipient])
        logger.info('Reservation SMS sent to %s', recipient)

    except Exception as exc:
        logger.error('Failed to send reservation SMS: %s', exc)
