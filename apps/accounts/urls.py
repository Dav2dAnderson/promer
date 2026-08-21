from django.urls import path, include

from .views import CustomRegisterView, ManagerRequestView, CustomLoginView

urlpatterns = [
    path('accounts/login/', CustomLoginView.as_view(), name='login-view'),
    path('accounts/registration/', CustomRegisterView.as_view(), name='registration-view'),
    path('accounts/manager-request/', ManagerRequestView.as_view(), name='manager-request'),

    path('accounts/', include('dj_rest_auth.urls')),
]