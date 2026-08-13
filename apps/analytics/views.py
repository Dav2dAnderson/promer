from django.shortcuts import render
from django.shortcuts import get_object_or_404
from django.utils import timezone
# for analytics 
from django.db.models import Avg, F, Count, ExpressionWrapper, DurationField

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import permissions

from apps.management.models import Project, Task


class ProjectAnalyticsView(APIView):
    """
    GET /api/analytics/projects/{slug}/
    Loyiha statistikasini qaytaradi.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        project = get_object_or_404(Project, slug=slug)

        if request.user != project.owner and request.user not in project.contributors.all():
            return Response({'error': 'Permission denied'}, status=403)

        tasks = Task.objects.filter(project=project)
        total = tasks.count()

        tasks_by_status = dict(
            tasks.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )

        completed = tasks_by_status.get('done', 0)
        complation_rate = round(completed / total * 100, 1) if total > 0 else 0

        github_completed = tasks.filter(
            comments__github_url__isnull=False,
            status='done'
        ).distinct().count()

        return Response({
            'project': {
                'name': project.name,
                'slug': project.slug,
                'owner': project.owner.username,
                'contributors_count': project.contributors.count(),
            },
            'tasks': {
                'total': total,
                'completed': completed,
                'completed_rate': complation_rate,
                'by_status': {
                    'pending': tasks_by_status.get('pending', 0),
                    'in_progress': tasks_by_status.get('in_progress', 0),
                    'pending_approval': tasks_by_status.get('pending_approval', 0),
                    'done': tasks_by_status.get('done', 0),
                }
            },
            'github': {
                'completed_via_pr': github_completed,
            }
        })


class ProjectMemberAnalyticsView(APIView):
    """
    GET /api/analytics/projects/{slug}/members/
    Har bir a'zoning samaradorligini qaytaradi.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        project = get_object_or_404(Project, slug=slug)

        if request.user != project.owner and not request.user.is_staff:
            return Response({'error': 'Permission denied'}, status=403)

        from apps.management.models import ProjectMember
        members = ProjectMember.objects.filter(
            project=project
        ).select_related('user')

        result = []
        for member in members:
            user_tasks = Task.objects.filter(
                project=project, to_user=member.user
            )
            total = user_tasks.count()
            completed = user_tasks.filter(status='done').count()

            result.append({
                'user': {
                    'id': str(member.user.id),
                    'username': member.user.username,
                    'full_name': member.user.get_full_name(),
                    'role': member.role,
                },
                'tasks': {
                    'total': total,
                    'completed': completed,
                    'completion_rate': round(completed / total * 100, 1) if total > 0 else 0,
                    'pending': user_tasks.filter(status='pending').count(),
                    'in_progress': user_tasks.filter(status='in_progress').count(),
                }
            })
            
        return Response(result)


class OverviewAnalyticsView(APIView):
    """
    GET /api/analytics/overview/
    Manager uchun umumiy ko'rinish.
    """
    permissions_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Faqat manager ko'ra oladi
        projects = Project.objects.filter(owner=user)
        total_projects = projects.count()

        tasks = Task.objects.filter(project__owner=user)
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status='done').count()

        # Bu haftada bajarilgan tasklar
        week_ago = timezone.now() - timezone.timedelta(days=7)
        completed_this_week = tasks.filter(
            status='done',
            updated_at__gte=week_ago
        ).count()

        # Kutilayotgan applicationlar
        from apps.management.models import Application
        pending_applications = Application.objects.filter(
            project__owner=user,
            status='pending'
        ).count()

        return Response({
            'projects': {
                'total': total_projects,
                'public': projects.filter(is_public=True).count(),
                'private': projects.filter(is_public=False).count(),
            },
            'tasks': {
                'total': total_tasks,
                'completed': completed_tasks,
                'completion_rate': round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0,
                'completed_this_week': completed_this_week,
            },
            'applications': {
                'pending': pending_applications,
            }
        })