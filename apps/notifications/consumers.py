import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer — foydalanuvchiga
    real-time notification yuboradi.

    URL: ws://localhost:8000/ws/notifications/
    """

    async def connect(self):
        user = self.scope.get('user')

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f'notifications_{str(user.id).replace("-", "")}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"WebSocket connected: {user.id}")

    async def disconnect(self, code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def notification_message(self, event):
        """Channel layer dan kelgan notificationni clientga yuboradi."""
        await self.send(text_data=json.dumps(event['data']))