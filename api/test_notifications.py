from datetime import time, timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from app1 import notify
from app1.models import (Announcement, Notification, Order, PasswordChangeCode, Product,
                         Reservation, Service, Wishlist)


def titles(user, **filters):
    return list(Notification.objects.filter(user=user, **filters).values_list('title', flat=True))


class Base(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='liz', password='pass', is_staff=True)
        self.admin2 = User.objects.create_user(username='kamau', password='pass', is_staff=True)
        self.customer = User.objects.create_user(username='wanjiru', password='pass')
        self.service = Service.objects.create(name='Barber', short_description='Fades', full_description='Fades')
        self.day = timezone.localdate() + timedelta(days=3)
        self.client = APIClient()

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client

    def booking(self, status=Reservation.STATUS_PENDING, day=None):
        return Reservation.objects.create(customer=self.customer, service=self.service,
                                          reservation_date=day or self.day, reservation_time=time(10, 0),
                                          status=status)


class ReservationNotificationTest(Base):
    def test_new_booking_tells_the_customer_and_every_admin_with_a_priority_approval(self):
        res = self.booking()
        self.assertEqual(titles(self.customer), ['Booking request received'])
        for admin in (self.admin, self.admin2):
            n = Notification.objects.get(user=admin)
            self.assertEqual((n.kind, n.priority, n.ref_type, n.ref_id), ('approval', True, 'reservation', res.pk))

    def test_approving_confirms_to_the_customer_and_clears_the_approval_from_every_admin_inbox(self):
        res = self.booking()
        r = self.as_user(self.admin).patch(f'/api/admin/reservations/{res.pk}/', {'status': 'APPROVED'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertIn('Booking confirmed', titles(self.customer))
        self.assertFalse(Notification.objects.filter(kind='approval', read_at__isnull=True).exists())

    def test_declining_tells_the_customer_to_pick_another_time(self):
        res = self.booking()
        res.status = Reservation.STATUS_REJECTED
        res.save()
        n = Notification.objects.get(user=self.customer, title='Booking declined')
        self.assertEqual(n.action_label, 'Choose another time')

    def test_a_customer_cancelling_tells_the_admins_the_slot_is_free(self):
        res = self.booking()
        r = self.as_user(self.customer).post(f'/api/reservations/{res.pk}/cancel/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Notification.objects.filter(kind='cancel').count(), 2)
        self.assertIn('free again', Notification.objects.filter(kind='cancel').first().body)

    def test_saving_without_a_status_change_creates_nothing_new(self):
        res = self.booking()
        before = Notification.objects.count()
        res.notes = 'Please bring the clippers'
        res.save()
        self.assertEqual(Notification.objects.count(), before)


class OrderNotificationTest(Base):
    def test_placing_an_order_tells_admins_and_confirming_it_tells_the_customer_it_is_ready(self):
        product = Product.objects.create(name='Moroccan Oil', description='Oil', price=Decimal('600'), stock_quantity=5)
        r = self.as_user(self.customer).post('/api/orders/', {
            'items': [{'item_type': 'product', 'item_id': product.pk, 'quantity': 1}]}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        order_id = r.json()['id']
        self.assertEqual(titles(self.admin), [f'New order #{order_id}'])

        r = self.as_user(self.admin).patch(f'/api/admin/orders/{order_id}/', {'status': 'CONFIRMED'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIn(f'Order #{order_id} is ready for pickup', titles(self.customer))
        self.assertFalse(Notification.objects.filter(user=self.admin, read_at__isnull=True).exists())

    def test_cancelling_a_pending_order_tells_both_sides_once(self):
        order = Order.objects.create(customer=self.customer, total_amount=Decimal('600'))
        self.as_user(self.customer).post(f'/api/orders/{order.pk}/cancel/')
        self.assertEqual(titles(self.customer), [f'Order #{order.pk} was cancelled'])
        self.assertEqual(Notification.objects.filter(user=self.admin, title__contains='cancelled').count(), 1)


class StockNotificationTest(Base):
    def setUp(self):
        super().setUp()
        self.oil = Product.objects.create(name='Moroccan Oil', description='Oil', price=Decimal('600'), stock_quantity=0)
        self.balm = Product.objects.create(name='Lip Balm', description='Balm', price=Decimal('100'), stock_quantity=0)
        wl = Wishlist.objects.create(user=self.customer)
        wl.products.add(self.oil, self.balm)

    def visible_unread(self):
        return list(notify.visible_to(self.customer).filter(read_at__isnull=True).values_list('title', flat=True))

    def test_a_wishlisted_item_coming_back_in_stock_notifies_the_customer(self):
        self.oil.stock_quantity = 4
        self.oil.save()
        n = Notification.objects.get(user=self.customer)
        self.assertEqual((n.title, n.body, n.link), ('Back in stock: Moroccan Oil', 'KES 600', f'/products/{self.oil.pk}'))

    def test_several_restocks_on_one_day_become_one_grouped_notification(self):
        for item in (self.oil, self.balm):
            item.stock_quantity = 3
            item.save()
        self.assertEqual(self.visible_unread(), ['2 wishlist items are back in stock'])

    def test_the_same_restock_twice_in_a_day_does_not_repeat(self):
        for qty in (3, 0, 5):
            self.oil.stock_quantity = qty
            self.oil.save()
        self.assertEqual(self.visible_unread(), ['Back in stock: Moroccan Oil'])

    def test_last_one_left_is_flagged(self):
        self.oil.stock_quantity = 3
        self.oil.save()
        Notification.objects.all().delete()
        self.oil.stock_quantity = 1
        self.oil.save()
        self.assertEqual(titles(self.customer), ['Only 1 left: Moroccan Oil'])

    def test_people_who_did_not_wishlist_it_hear_nothing(self):
        self.oil.stock_quantity = 3
        self.oil.save()
        self.assertFalse(Notification.objects.filter(user=self.admin).exists())


class SecurityNotificationTest(Base):
    def test_a_password_change_is_recorded(self):
        PasswordChangeCode.objects.create(user=self.customer, code='123456', new_password='new-pass-123',
                                          expires_at=timezone.now() + timedelta(minutes=5))
        r = self.as_user(self.customer).post('/api/auth/change-password/confirm/', {'code': '123456'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(titles(self.customer, kind='security'), ['Your password was changed'])

    def test_other_admins_hear_when_someone_is_made_admin(self):
        self.customer.is_staff = True
        self.customer.save()
        self.assertEqual(titles(self.admin, kind='security'), ['New admin added'])
        self.assertFalse(Notification.objects.filter(user=self.customer, kind='security').exists())


class InboxAPITest(Base):
    def test_the_inbox_lists_only_my_notifications_with_an_unread_count(self):
        notify.notify(self.customer, 'booking', 'Mine')
        notify.notify(self.admin, 'data', 'Not mine')
        data = self.as_user(self.customer).get('/api/notifications/').json()
        self.assertEqual(data['unread_count'], 1)
        self.assertEqual([n['title'] for n in data['results']], ['Mine'])
        self.assertTrue(data['results'][0]['unread'])

    def test_marking_read_by_id_and_all_only_touches_my_rows(self):
        a = notify.notify(self.customer, 'booking', 'A')
        notify.notify(self.customer, 'booking', 'B')
        theirs = notify.notify(self.admin, 'data', 'C')
        client = self.as_user(self.customer)
        self.assertEqual(client.post('/api/notifications/read/', {'ids': [a.pk, theirs.pk]}, format='json').json(), {'marked': 1})
        self.assertEqual(client.get('/api/notifications/').json()['unread_count'], 1)
        client.post('/api/notifications/read/', {'all': True}, format='json')
        self.assertEqual(client.get('/api/notifications/').json()['unread_count'], 0)
        theirs.refresh_from_db()
        self.assertIsNone(theirs.read_at)

    def test_bad_mark_read_payload_is_rejected(self):
        r = self.as_user(self.customer).post('/api/notifications/read/', {'ids': 'all'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_signed_out_visitors_get_nothing(self):
        self.assertEqual(APIClient().get('/api/notifications/').status_code, 401)


class ScheduledCheckTest(Base):
    def test_appointment_tomorrow_reminder_is_created_once(self):
        self.booking(status=Reservation.STATUS_APPROVED, day=timezone.localdate() + timedelta(days=1))
        Notification.objects.all().delete()
        notify.run_due_checks(force=True)
        notify.run_due_checks(force=True)
        self.assertEqual(Notification.objects.filter(user=self.customer, kind='reminder').count(), 1)

    def test_low_stock_is_one_morning_digest_per_admin(self):
        for i in range(5):
            Product.objects.create(name=f'Item {i}', description='x', price=Decimal('10'), stock_quantity=1, reorder_level=5)
        morning = timezone.localtime().replace(hour=8)
        with mock.patch('app1.notify.timezone.localtime', return_value=morning):
            notify.run_due_checks(force=True)
            notify.run_due_checks(force=True)
        digest = Notification.objects.filter(user=self.admin, kind='inventory')
        self.assertEqual(digest.count(), 1)
        self.assertEqual(digest.first().title, '5 items at or below reorder level')
        self.assertIn('and 2 more', digest.first().body)

    def test_no_expenses_by_the_seventh_raises_a_data_check(self):
        tenth = timezone.localdate().replace(day=10)
        with mock.patch('app1.notify.timezone.localdate', return_value=tenth):
            notify.expense_data_check()
        self.assertEqual(titles(self.admin, kind='data'), ['No expenses recorded this month'])

    def test_notifications_older_than_30_days_are_removed(self):
        old = notify.notify(self.customer, 'booking', 'Old')
        Notification.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=31))
        notify.cleanup()
        self.assertFalse(Notification.objects.filter(pk=old.pk).exists())

    def test_the_management_command_runs(self):
        from django.core.management import call_command
        call_command('notification_checks', stdout=mock.MagicMock())


class AnnouncementAPITest(Base):
    def test_only_a_live_announcement_is_shown(self):
        now = timezone.now()
        Announcement.objects.create(message='Expired', ends_at=now - timedelta(hours=1))
        Announcement.objects.create(message='Later', starts_at=now + timedelta(days=1))
        Announcement.objects.create(message='Off', is_active=False)
        self.assertIsNone(APIClient().get('/api/announcements/current/').json()['announcement'])
        Announcement.objects.create(message='25% off braiding until 31 Oct', link_label='Book now', link_url='/beauty/services')
        data = APIClient().get('/api/announcements/current/').json()['announcement']
        self.assertEqual((data['message'], data['link_label']), ('25% off braiding until 31 Oct', 'Book now'))

    def test_only_admins_manage_announcements(self):
        body = {'message': 'Opening at 10 AM on Mashujaa Day', 'tone': 'dark'}
        self.assertEqual(self.as_user(self.customer).post('/api/admin/announcements/', body, format='json').status_code, 403)
        r = self.as_user(self.admin).post('/api/admin/announcements/', body, format='json')
        self.assertEqual(r.status_code, 201)
        pk = r.json()['id']
        self.assertEqual(self.client.patch(f'/api/admin/announcements/{pk}/', {'is_active': False}, format='json').json()['is_active'], False)
        self.assertEqual(self.client.delete(f'/api/admin/announcements/{pk}/').status_code, 204)

    def test_end_must_come_after_start(self):
        now = timezone.now()
        r = self.as_user(self.admin).post('/api/admin/announcements/', {
            'message': 'x', 'starts_at': now.isoformat(), 'ends_at': (now - timedelta(hours=1)).isoformat()}, format='json')
        self.assertEqual(r.status_code, 400)
