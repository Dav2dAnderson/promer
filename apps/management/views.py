from rest_framework.permissions import IsAuthenticated
from django.shortcuts import render, get_object_or_404
from django.db.models import Q

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, extend_schema_view

from .serializers import (
    ProjectListSerializer, 
    ProjectDetailSerializer, 
    ApplicationListSerializer, 
    ApplicationDetailSerializer, 
    TaskListSerializer,
    TaskDetailSerializer,
    DepartmentSerializer,
    DepartmentMemberSerializer,
    DepartmentMembersDetailSerializer,
    TaskCommentSerializer
    )
from .models import Project, Application, Task, Department, DepartmentMember, TaskComment
from .permissions import IsNotProjectOwner, IsManager, IsProjectOwner, IsAdminOrApplicationOwner, IsAdminOrOwner
from .filters import ProjectFilter
# Create your views here.


@extend_schema_view(
    list=extend_schema(
        summary="List projects",
        description=(
            "Returns all public projects plus projects the authenticated user owns or contributes to. "
            "Supports filtering via query parameters."
        ),
        tags=["Projects"],
    ),
    create=extend_schema(
        summary="Create a project",
        description="Creates a new project. Requires the Manager role.",
        tags=["Projects"],
    ),
    retrieve=extend_schema(
        summary="Retrieve a project",
        description="Retrieves full details for a single project by its slug.",
        tags=["Projects"],
    ),
    update=extend_schema(
        summary="Update a project (full)",
        description="Fully replaces a project. Requires Manager role and project ownership.",
        tags=["Projects"],
    ),
    partial_update=extend_schema(
        summary="Partially update a project",
        description="Partially updates a project. Requires Manager role and project ownership.",
        tags=["Projects"],
    ),
    destroy=extend_schema(
        summary="Delete a project",
        description="Deletes a project. Requires Manager role and project ownership.",
        tags=["Projects"],
    ),
)
class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing projects.

    - **list / retrieve**: any authenticated user can view public projects and projects they own or contribute to.
    - **create**: requires Manager role.
    - **update / partial_update / destroy**: requires Manager role *and* project ownership.
    """
    filterset_class = ProjectFilter
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action == 'create':
            return [IsManager()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsManager(), IsProjectOwner()]
        # list and retrieve also require authentication
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        return Project.objects.select_related('owner').prefetch_related('contributors').filter(
            Q(is_public=True) | Q(owner=user) | Q(contributors=user)
        ).distinct()

    def get_serializer_class(self):
        if self.action in ['retrieve', 'destroy', 'update', 'partial_update']:
            return ProjectDetailSerializer
        return ProjectListSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


@extend_schema_view(
    list=extend_schema(
        summary="List my applications",
        description="Returns all applications submitted by the authenticated user, optionally scoped to a project.",
        tags=["Applications"],
    ),
    create=extend_schema(
        summary="Apply to a project",
        description="Creates a new application to contribute to the specified project. Project owners cannot apply to their own projects.",
        tags=["Applications"],
    ),
    retrieve=extend_schema(
        summary="Retrieve an application",
        description="Retrieves the details of a specific application by its slug.",
        tags=["Applications"],
    ),
    update=extend_schema(
        summary="Update an application (full)",
        description="Fully replaces an application. Only the application owner or admin can do this.",
        tags=["Applications"],
    ),
    partial_update=extend_schema(
        summary="Partially update an application",
        description="Partially updates an application. Only the application owner or admin can do this.",
        tags=["Applications"],
    ),
    destroy=extend_schema(
        summary="Delete an application",
        description="Deletes an application. Only the application owner or admin can do this.",
        tags=["Applications"],
    ),
)
class ApplicationViewSet(viewsets.ModelViewSet):
    """
    For filling applications in order to contribute in a project
    """
    lookup_field = 'slug'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Application.objects.none()
        queryset = Application.objects.select_related('user', 'project').filter(user=user)
        
        project_slug = self.kwargs.get('project_slug')
        if project_slug:
            queryset = queryset.filter(project__slug=project_slug)
        return queryset
    
    def get_serializer_class(self):
        if self.action in ['retrieve', 'destroy', 'update', 'partial_update']:
            return ApplicationDetailSerializer
        return ApplicationListSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsNotProjectOwner(), IsAdminOrApplicationOwner()]
        if self.action == 'retrieve':
            return [IsAdminOrApplicationOwner()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        project_slug = self.kwargs.get('project_slug')
        project = get_object_or_404(Project, slug=project_slug) 
        serializer.save(user=self.request.user, project=project)


@extend_schema_view(
    list=extend_schema(
        summary="List received applications",
        description="Returns all applications received for projects owned by the authenticated manager.",
        tags=["Received Applications"],
    ),
    retrieve=extend_schema(
        summary="Retrieve a received application",
        description="Retrieves details of a specific application received for one of the manager's projects.",
        tags=["Received Applications"],
    ),
    update=extend_schema(
        summary="Update a received application",
        description="Fully replaces a received application record.",
        tags=["Received Applications"],
    ),
    partial_update=extend_schema(
        summary="Partially update a received application",
        description="Partially updates a received application record.",
        tags=["Received Applications"],
    ),
    destroy=extend_schema(
        summary="Delete a received application",
        tags=["Received Applications"],
    ),
)
class ReceivedApplicationsViewSet(viewsets.ModelViewSet):
    permission_classes = [IsProjectOwner, IsManager]
    lookup_field = 'slug'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Application.objects.none()
        return Application.objects.select_related('user', 'project').filter(project__owner=user)
    
    def get_serializer_class(self):
        if self.action in ['delete', 'retrieve', 'update', 'partial_update']:
            return ApplicationDetailSerializer
        return ApplicationListSerializer

    def get_permissions(self):
        if self.action in ['accept', 'reject']:
            return [IsAuthenticated(), IsProjectOwner(), IsManager()]
        return super().get_permissions()
    
    @extend_schema(
        summary="Accept an application",
        description=(
            "Marks the application as accepted and automatically adds the applicant "
            "as a contributor to the project."
        ),
        tags=["Received Applications"],
        request=None,
        responses={200: None},
    )
    @action(detail=True, methods=['patch'], url_path='accept')
    def accept(self, request, slug=None):
        application = self.get_object()
        application.status = 'accepted'
        application.is_accepted = True  # Keep for backward compatibility
        application.project.contributors.add(application.user)
        application.save(update_fields=['status', 'is_accepted'])
        return Response({'message': 'Application accepted.'}, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Reject an application",
        description=(
            "Marks the application as rejected."
        ),
        tags=["Received Applications"],
        request=None,
        responses={200: None},
    )
    @action(detail=True, methods=['patch'], url_path='reject')
    def reject(self, request, slug=None):
        application = self.get_object()
        application.status = 'rejected'
        application.is_accepted = False  # Keep for backward compatibility
        application.save(update_fields=['status', 'is_accepted'])
        return Response({'message': 'Application rejected.'}, status=status.HTTP_200_OK)
    

@extend_schema_view(
    list=extend_schema(
        summary="List tasks",
        description=(
            "Returns tasks for the authenticated user's projects. "
            "Admins/staff see all tasks. Optionally scoped by project slug."
        ),
        tags=["Tasks"],
    ),
    create=extend_schema(
        summary="Create a task",
        description="Creates a new task. Caller must be the project owner (or staff).",
        tags=["Tasks"],
    ),
    retrieve=extend_schema(
        summary="Retrieve a task",
        description="Retrieves the full details of a single task by its slug.",
        tags=["Tasks"],
    ),
    update=extend_schema(
        summary="Update a task (full)",
        description="Fully replaces a task record.",
        tags=["Tasks"],
    ),
    partial_update=extend_schema(
        summary="Partially update a task",
        description="Partially updates a task record.",
        tags=["Tasks"],
    ),
    destroy=extend_schema(
        summary="Delete a task",
        tags=["Tasks"],
    ),
)
class TasksViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrOwner]
    lookup_field = 'slug'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Task.objects.none()

        project_slug = self.kwargs.get('project_slug')
        if user.is_staff or user.is_superuser:
            queryset = Task.objects.select_related('project', 'to_user', 'from_user').all()
            if project_slug:
                queryset = queryset.filter(project__slug=project_slug)
            return queryset

        if user.is_manager:
            queryset = Task.objects.select_related('project', 'to_user', 'from_user').filter(project__owner=user)
            if project_slug:
                queryset = queryset.filter(project__slug=project_slug)
            return queryset

        queryset = Task.objects.select_related('project', 'to_user', 'from_user').filter(to_user=user)
        if project_slug:
            queryset = queryset.filter(project__slug=project_slug)
        return queryset

    def perform_create(self, serializer):
        project_slug = self.kwargs.get('project_slug')
        if project_slug:
            project = get_object_or_404(Project, slug=project_slug)
            if project.owner != self.request.user and not self.request.user.is_staff:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You must be the project owner to create a task.")
            serializer.save(from_user=self.request.user, project=project)
        else:
            project = serializer.validated_data.get('project')
            if project and project.owner != self.request.user and not self.request.user.is_staff:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You must be the project owner to create a task.")
            serializer.save(from_user=self.request.user)
    
    def get_serializer_class(self):
        if self.action in ['create', 'retrieve', 'delete', 'update', 'partial_update']:
            return TaskDetailSerializer
        return TaskListSerializer
    
    def get_permissions(self):
        if self.action == 'complete':
            return [IsAuthenticated()]
        return super().get_permissions()
    
    @extend_schema(
        summary="Complete a task",
        description=(
            "Marks the task as completed by setting status to 'done'."
        ),
        tags=["Tasks"],
        request=None,
        responses={200: None},
    )
    @action(detail=True, methods=['patch'], url_path='complete')
    def complete(self, request, slug=None):
        task = self.get_object()
        user = request.user
        
        # Check if user has permission to complete the task
        is_owner = task.project.owner == user
        is_assigned = task.to_user == user
        is_staff = user.is_staff or user.is_superuser
        
        if not (is_owner or is_assigned or is_staff):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to complete this task.")
        
        task.status = 'done'
        task.save(update_fields=['status'])
        return Response({'message': 'Task marked as completed.'}, status=status.HTTP_200_OK)


class TaskCommentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskCommentSerializer
    
    def get_queryset(self):
        task_slug = self.kwargs.get('task_slug')
        return TaskComment.objects.select_related('task', 'user').filter(task__slug=task_slug)
    
    def perform_create(self, serializer):
        task_slug = self.kwargs.get('task_slug')
        task = get_object_or_404(Task, slug=task_slug)

        user = self.request.user
        is_owner = task.project.owner == user
        is_assigned = task.to_user == user
        is_staff = user.is_staff or user.is_superuser

        if not (is_owner or is_assigned or is_staff):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to create a comment on this task.")
        serializer.save(user=user, task=task)


@extend_schema_view(
    list=extend_schema(
        summary="List departments",
        description="Returns all departments belonging to projects owned by the authenticated manager.",
        tags=["Departments"],
    ),
    create=extend_schema(
        summary="Create a department",
        description="Creates a department within the specified project. Requires Manager role and project ownership.",
        tags=["Departments"],
    ),
    retrieve=extend_schema(
        summary="Retrieve a department",
        description="Retrieves details of a single department by its slug.",
        tags=["Departments"],
    ),
    update=extend_schema(
        summary="Update a department (full)",
        tags=["Departments"],
    ),
    partial_update=extend_schema(
        summary="Partially update a department",
        tags=["Departments"],
    ),
    destroy=extend_schema(
        summary="Delete a department",
        tags=["Departments"],
    ),
)
class DeparmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsProjectOwner, IsManager]
    lookup_field = 'slug'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Department.objects.none()
        project_slug = self.kwargs.get('project_slug')
        project = get_object_or_404(Project, slug=project_slug)
        return Department.objects.select_related('project').prefetch_related('user').filter(project__owner=user, project=project)
    
    def perform_create(self, serializer):
        project_slug = self.kwargs.get('project_slug')
        project = get_object_or_404(Project, slug=project_slug)
        if project.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You must be the project owner to create a department")
        serializer.save(project=project)

@extend_schema_view(
    list=extend_schema(
        summary="List department members",
        description="Returns all members of the specified department.",
        tags=["Department Members"],
    ),
    create=extend_schema(
        summary="Add a department member",
        description="Adds a user to a department with a specified role.",
        tags=["Department Members"],
    ),
    retrieve=extend_schema(
        summary="Retrieve a department member",
        description="Retrieves details of a specific department membership.",
        tags=["Department Members"],
    ),
    update=extend_schema(
        summary="Update a department member (full)",
        tags=["Department Members"],
    ),
    partial_update=extend_schema(
        summary="Partially update a department member",
        tags=["Department Members"],
    ),
    destroy=extend_schema(
        summary="Remove a department member",
        description="Removes a user from the department.",
        tags=["Department Members"],
    ),
)
class DepartmentMemberViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentMemberSerializer
    permission_classes = [IsAuthenticated, IsProjectOwner, IsManager]
    lookup_field = 'id'

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DepartmentMember.objects.none()
        
        department_slug = self.kwargs.get('department_slug')
        # Only show members of departments owned by the authenticated user
        return DepartmentMember.objects.select_related(
            'user', 'department'
        ).filter(department__slug=department_slug, department__project__owner=user)

    def perform_create(self, serializer):
        department_slug = self.kwargs.get('department_slug')
        department = get_object_or_404(Department, slug=department_slug)
        
        # Only allow adding members to departments owned by the user
        if department.project.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You must be the project owner to add department members.")
        
        serializer.save(department=department)