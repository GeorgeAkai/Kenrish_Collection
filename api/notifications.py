import logging
import os

from django.core.mail import send_mail

logger = logging.getLogger(__name__)

ADMIN_EMAIL = os.environ.get('ADMIN_NOTIFY_EMAIL', 'georgeakaing@gmail.com')


def send_reservation_email(reservation) -> None:
    """Email the admin when a new reservation is created."""
    try:
        customer = reservation.customer
        service_name = reservation.service.name if reservation.service else 'General'
        res_date = reservation.reservation_date.strftime('%d %b %Y')
        res_time = reservation.reservation_time.strftime('%I:%M %p')
        customer_email = customer.email or 'N/A'

        subject = f'[Kenrish Collection] New Booking — {service_name} on {res_date}'
        body = (
            f'Hi Elizabeth,\n\n'
            f'A new reservation has just been made.\n\n'
            f'  Customer : {customer.username}\n'
            f'  Email    : {customer_email}\n'
            f'  Service  : {service_name}\n'
            f'  Date     : {res_date}\n'
            f'  Time     : {res_time}\n\n'
            f'Log in to the admin panel to approve or manage the booking.\n\n'
            f'— Kenrish Collection'
        )

        send_mail(subject, body, None, [ADMIN_EMAIL], fail_silently=False)
        logger.info('Reservation notification sent to %s', ADMIN_EMAIL)

    except Exception as exc:
        logger.error('Failed to send reservation notification: %s', exc)
