from django.urls import path
from .consumers import NotificationConsumer

ebsocket_urlpatterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
]

