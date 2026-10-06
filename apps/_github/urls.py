from django.urls import path

from .views import (
    GitHubConnectRepoView,
    GitHubOAuthCallbackView,
    GitHubOAuthStartView,
    GitHubOAuthTokenView,
    GitHubWebhookView,
    GitHubReposView,
)


urlpatterns = [
    path('login/', GitHubOAuthStartView.as_view()),
    path('callback/', GitHubOAuthCallbackView.as_view()),
    path('token/', GitHubOAuthTokenView.as_view()),
    path('repos/', GitHubReposView.as_view()),
    path('connect-repo/', GitHubConnectRepoView.as_view()),
    path('webhook/', GitHubWebhookView.as_view())
]