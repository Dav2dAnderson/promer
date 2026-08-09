from django.urls import path
from .views import ProjectAnalyticsView, ProjectMemberAnalyticsView, OverviewAnalyticsView

urlpatterns = [
    path('overview/', OverviewAnalyticsView.as_view(), name='overview'),
    path('projects/<slug:slug>/', ProjectAnalyticsView.as_view(), name='project-analytics'),
    path('projects/<slug:slug>/members/', ProjectMemberAnalyticsView.as_view(), name='project-member-analytics'),
]