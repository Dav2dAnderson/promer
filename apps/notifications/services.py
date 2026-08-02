from __future__ import annotations

import asyncio
import logging

from django.core.mail import send_mail
from django.conf import settings

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def send_email(*, email: str, subject: str, message: str) -> bool:
    """
    Django send_mail orqali email yuboradi.
    """
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info(f"Email yuborildi: {email} | subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"Email yuborishda xato: {email} — {e}")
        return False



def send_notification(*, user, title: str, 
    message: str, notification_type: str, 
    link: str = None, send_email: bool = False
    ):
    """
    Notification yaratadi, WebSocket orqali yuboradi,
    va ixtiyoriy ravishda email ham yuboradi.

    Args:
        user: CustomUser instance
        title: Notification sarlavhasi
        message: Notification matni
        notification_type: Notification.Type qiymati
        link: Frontend URL (ixtiyoriy)
        send_email: Email ham yuborilsinmi
    """
    from apps.notifications.models import Notification

    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        type=notification_type,
        link=link,
    )

    _send_websocket_notification(user=user, notification=notification)

    if send_email and user.email:
        send_email_notification(
            email=user.email,
            subject=title,
            message=message,
        )

    return notification

def _send_websocket_notification(*, user, notification):
    """
    Django Channels orqali foydalanuvchiga
    real-time notification yuboradi.
    """

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    try:
        async_to_sync(channel_layer.group_send)(
            f'notification_{user.id}',
            {
                'type': 'notification.message',
                'data': {
                    'id': str(notification.id),
                    'title': notification.title,
                    'message': notification.message,
                    'type': notification.type,
                    'link': notification.link,
                    'is_read': notification.is_read,
                    'created_at': notification.created_at.isoformat(),
                }
            }
        )
    except Exception as e:
        logger.error(f"Websocket notification sending error, {e}")

def send_email_notification(*, email: str, subject: str, message: str) -> bool:
    return send_email(email=email, subject=subject, message=message)