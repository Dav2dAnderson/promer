from django.shortcuts import render

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer
# Create your views here.


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/ — o'qilmagan va o'qilgan notificationlar
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationMarkReadView(APIView):
    """
    PATCH /api/notifications/{id}/read/ — o'qildi deb belgilash
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        notification = Notification.objects.filter(pk=pk, user=self.request.user).first()

        if not notification:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'message': 'Marked read.'})


class NotificationMarkAllReadView(APIView):
    """
    PATCH /api/notifications/read-all/ — barchasini o'qildi deb belgilash
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(
            user=self.request.user,
            is_read=False
        ).update(is_read=True)
        return Response({'message': 'All notification marked read.'})

