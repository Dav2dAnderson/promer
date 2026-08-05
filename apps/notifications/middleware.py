from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async

from django.contrib.auth.models import AnonymousUser

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken


@database_sync_to_async
def get_user_from_token(token_key):
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        token = AccessToken(token_key)
        user_id = token['user_id']
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    WebSocket uchun JWT token orqali autentifikatsiya.
    Token query parameter orqali yuboriladi:
    ws://localhost:8000/ws/notifications/?token=<access_token>
    """
    async def __call__(self, scope, receive, send):
        from urllib.parse import parse_qs

        query_string = scope.get('query_string', b'').decode('utf-8', errors='ignore')
        print(query_string)
        params = parse_qs(query_string)
        token_list = params.get('token', [])

        if token_list:
            token = token_list[0]
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
    