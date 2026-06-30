import logging
import os
import threading

from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

ADMIN_EMAIL = os.environ.get('ADMIN_NOTIFY_EMAIL', 'elizabethnguruka@gmail.com')

LOGO_URL = 'https://fyejjrqtkivnscygihyx.supabase.co/storage/v1/object/public/kenrish-bucket/gallery/ChatGPT_Image_Jun_4_2025_03_18_38_PM.png'


def _build_html(customer_name, customer_email, service_name, res_date, res_time):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Reservation — Kenrish Collection</title>
</head>
<body style="margin:0;padding:0;background:#F9F6FB;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6FB;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#7C3060 0%,#A05085 100%);border-radius:16px 16px 0 0;padding:36px 40px 28px;">
              <img src="{LOGO_URL}" alt="Kenrish Collection" width="120" style="display:block;margin:0 auto 12px;height:auto;" />
              <p style="margin:0;color:rgba(255,255,255,0.75);font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Salon &amp; Beauty Store</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FDFAFF;padding:36px 40px 28px;">
              <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1A1220;">New Booking Received</p>
              <p style="margin:0 0 28px;font-size:14px;color:#6A4E78;">Hi Elizabeth, a customer just made a reservation. Here are the details:</p>

              <!-- Detail card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0E8F5;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      {_row('Customer', customer_name)}
                      {_row('Email', customer_email, last=False)}
                      {_row('Service', service_name)}
                      {_row('Date', res_date)}
                      {_row('Time', res_time, last=True)}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td align="center" style="border-radius:50px;background:#7C3060;">
                    <a href="https://kenrish.onrender.com/admin" style="display:inline-block;padding:14px 36px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">
                      View in Admin Panel &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#A08AB0;text-align:center;">
                This is an automated notification from Kenrish Collection.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#EDE0F2;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#6A4E78;font-weight:600;">Kenrish Collection</p>
              <p style="margin:0;font-size:11px;color:#A08AB0;">Shabaab, Nakuru, Kenya &nbsp;&bull;&nbsp; 0708 440390</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _row(label, value, last=False):
    border = '' if last else 'border-bottom:1px solid #D8C8E8;'
    return f"""
      <tr>
        <td style="padding:10px 0;{border}">
          <span style="font-size:11px;font-weight:700;color:#A08AB0;text-transform:uppercase;letter-spacing:1px;">{label}</span>
          <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#1A1220;">{value}</p>
        </td>
      </tr>"""


def send_reservation_email(reservation) -> None:
    """Email the admin when a new reservation is created (fires in a background thread)."""
    threading.Thread(target=_send, args=(reservation,), daemon=True).start()


def _send(reservation) -> None:
    try:
        customer = reservation.customer
        service_name = reservation.service.name if reservation.service else 'General'
        res_date = reservation.reservation_date.strftime('%d %b %Y')
        res_time = reservation.reservation_time.strftime('%I:%M %p')
        customer_email = customer.email or 'N/A'

        subject = f'[Kenrish] New Booking — {service_name} on {res_date} at {res_time}'

        plain = (
            f'Hi Elizabeth,\n\n'
            f'New reservation received.\n\n'
            f'  Customer : {customer.username}\n'
            f'  Email    : {customer_email}\n'
            f'  Service  : {service_name}\n'
            f'  Date     : {res_date}\n'
            f'  Time     : {res_time}\n\n'
            f'Log in to the admin panel to approve or manage the booking.\n\n'
            f'— Kenrish Collection'
        )

        html = _build_html(customer.username, customer_email, service_name, res_date, res_time)

        msg = EmailMultiAlternatives(subject, plain, None, [ADMIN_EMAIL])
        msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=False)

        logger.info('Reservation notification sent to %s', ADMIN_EMAIL)

    except Exception as exc:
        logger.error('Failed to send reservation notification: %s', exc)
