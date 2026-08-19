import logging

from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async

from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

logger = logging.getLogger(__name__)

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_key):
    """
    JWT Access Token orqali foydalanuvchini bazadan qidirib topadi.
    Token xato bo'lsa yoki foydalanuvchi topilmasa None qaytaradi.
    """
    try:
        token = AccessToken(token_key)
        user_id = token['user_id']
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return None
    

class JWTAuthMiddleware(BaseMiddleware):
    """
    WebSocket ulanishlari uchun xavfsiz Cookie-based JWT autentifikatsiya middleware-i.
    Token brauzer cookie'sidan ('my-app-auth') o'qib olinadi.
    """
    async def __call__(self, scope, receive, send):
        cookies = {}

        for header in scope.get('headers', []):
            if header[0] == b'cookie':
                for cookie in header[1].decode().split(';'):
                    if '=' in cookie:
                        k, v = cookie.strip().split('=', 1)
                        cookies[k] = v
        token = cookies.get('my-app-auth')
        user = None
        if token:
            user = await get_user_from_token(token)
        if not user or user.is_anonymous:
            logger.warning("WebSocket auth failed: Invalid token or missing cookie.")
            await send({
                "type": "websocket.close",
                "code": 4001,
            })
            return
        scope['user'] = user
        return await super().__call__(scope, receive, send)