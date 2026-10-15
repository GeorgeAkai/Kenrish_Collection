"""Bell inbox and announcement bar endpoints. All data comes from our own tables."""
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from app1 import notify
from app1.models import Announcement, Notification

MAX_ITEMS = 50


class NotificationSerializer(serializers.ModelSerializer):
    unread = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'kind', 'title', 'body', 'link', 'action_label', 'priority',
                  'ref_type', 'ref_id', 'thumb', 'unread', 'created_at']

    def get_unread(self, obj):
        return obj.read_at is None


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'message', 'tone', 'link_label', 'link_url', 'dismissible',
                  'is_active', 'starts_at', 'ends_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        starts = attrs.get('starts_at', getattr(self.instance, 'starts_at', None))
        ends = attrs.get('ends_at', getattr(self.instance, 'ends_at', None))
        if starts and ends and ends <= starts:
            raise serializers.ValidationError({'ends_at': 'End must be after the start.'})
        return attrs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """The caller's notifications from the last 30 days, newest first, plus the unread count.
    Polled by the site every 60s while the tab is visible."""
    notify.run_due_checks()
    qs = notify.visible_to(request.user)
    return Response({
        'unread_count': qs.filter(read_at__isnull=True).count(),
        'results': NotificationSerializer(qs[:MAX_ITEMS], many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_mark_read(request):
    """Body: {"ids": [1, 2]} to mark some, or {"all": true} to mark everything read."""
    qs = Notification.objects.filter(user=request.user, read_at__isnull=True)
    if not request.data.get('all'):
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not all(isinstance(i, int) for i in ids):
            return Response({'detail': 'Send "ids" as a list of numbers, or "all": true.'},
                            status=status.HTTP_400_BAD_REQUEST)
        qs = qs.filter(pk__in=ids)
    updated = qs.update(read_at=timezone.now())
    return Response({'marked': updated})


def _live_announcements():
    now = timezone.now()
    return (Announcement.objects.filter(is_active=True)
            .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
            .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now)))


@api_view(['GET'])
@permission_classes([AllowAny])
def announcement_current(request):
    """{"announcement": <the one to show site-wide right now> | null}"""
    current = _live_announcements().first()
    return Response({'announcement': AnnouncementSerializer(current).data if current else None})


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def admin_announcement_list(request):
    if request.method == 'GET':
        return Response(AnnouncementSerializer(Announcement.objects.all()[:50], many=True).data)
    serializer = AnnouncementSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminUser])
def admin_announcement_detail(request, pk):
    item = Announcement.objects.filter(pk=pk).first()
    if not item:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if request.method == 'DELETE':
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = AnnouncementSerializer(item, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
