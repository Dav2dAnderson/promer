from rest_framework import permissions

from django.shortcuts import get_object_or_404
from apps.management.models import Project

class IsNotProjectOwner(permissions.BasePermission):
    """
    Checking if user owns the project.
    """
    message = "You can't create application, because you own this project."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.method == 'POST':
            project_slug = view.kwargs.get('project_slug')
            if project_slug:
                project = get_object_or_404(Project, slug=project_slug)

                return project.owner != request.user
        return True
    
class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if request.method == 'POST':
            if user.is_authenticated and user.is_manager:
                return True
            return False
        return True
    

class IsProjectOwner(permissions.BasePermission):
    message = "You don't own the project."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        project_slug = view.kwargs.get('project_slug')
        if project_slug:
            project = get_object_or_404(Project, slug=project_slug)
            return project.owner == request.user
        return True

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'project'):
            return obj.project.owner == request.user
        return obj.owner == request.user


class IsAdminOrApplicationOwner(permissions.BasePermission):
    message = "Ushbu amalni bajarish uchun siz loyiha admini yoki ariza muallifi bo'lishingiz kerak."

    def has_object_permission(self, request, view, obj):
        # Foydalanuvchi tizimga kirganligini tekshiramiz
        if not request.user or not request.user.is_authenticated:
            return False
            
        # 1-shart: Agar foydalanuvchi Admin bo'lsa -> Ruxsat beriladi
        if request.user.is_staff or request.user.is_superuser:
            return True
            
        # 2-shart: Agar foydalanuvchi ariza egasi bo'lsa -> Ruxsat beriladi
        return obj.user == request.user
    

class IsAdminOrOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_manager

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff or request.user.is_superuser:
            return True
        if request.method in permissions.SAFE_METHODS:
            if hasattr(obj, 'to_user') and obj.to_user == request.user:
                return True
            if hasattr(obj, 'project') and obj.project.owner == request.user:
                return True
            return False
        if hasattr(obj, 'project'):
            return obj.project.owner == request.user and request.user.is_manager
        return obj.owner == request.user and request.user.is_manager

