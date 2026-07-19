from django.urls import path, include

from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from .webhooks.views import GitHubWebHookView

from .views import (
    ProjectViewSet, 
    ApplicationViewSet, 
    ReceivedApplicationsViewSet, 
    TasksViewSet, 
    DeparmentViewSet, 
    DepartmentMemberViewSet,
    TaskCommentViewSet
    )

router = DefaultRouter()

router.register('projects', ProjectViewSet, basename='projects')
nested_router = routers.NestedDefaultRouter(router, r'projects', lookup='project')
nested_router.register(r'applications', ApplicationViewSet, basename='project-applications')
nested_router.register(r'tasks', TasksViewSet, basename='project-tasks')
nested_router.register(r'departments', DeparmentViewSet, basename='departments')

task_router = routers.NestedDefaultRouter(nested_router, r'tasks', lookup='task')
task_router.register(r'comments', TaskCommentViewSet, basename='task-comments')

department_router = routers.NestedDefaultRouter(nested_router, r'departments', lookup='department')
department_router.register(r'members', DepartmentMemberViewSet, basename='department-members')

router.register('received-applications', ReceivedApplicationsViewSet, basename='received-applications')
router.register('applications', ApplicationViewSet, basename='applications')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(nested_router.urls)),
    path('', include(department_router.urls)),
    path('', include(task_router.urls)),

    path('webhooks/github/', GitHubWebHookView.as_view()),
]

