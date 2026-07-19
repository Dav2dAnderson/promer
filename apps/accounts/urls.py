from django.urls import path, include

from .views import CustomRegister, ManagerRequestView

urlpatterns = [
    path('accounts/', include('dj_rest_auth.urls')),
    path('accounts/registration/', CustomRegister.as_view(), name='registration-view'),
    path('accounts/manager-request/', ManagerRequestView.as_view(), name='manager-request')
]