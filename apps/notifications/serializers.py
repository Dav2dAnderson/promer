from rest_framework import serializers

from base.serializers import BaseSerializer

from .models import Notification


class NotificationSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Notification
        fields = BaseSerializer.Meta.fields + ['id', 'title', 'message', 'type', 'is_read', 'link']
        read_only_fields = ['id', 'title', 'message', 'type', 'link', 'created_at']
        