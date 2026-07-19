import django_filters

from django.db.models import Q

from .models import Project, Application

class ProjectFilter(django_filters.FilterSet):
    my_projects = django_filters.CharFilter(method='filter_my_projects')

    class Meta:
        model = Project
        fields = []

    def filter_my_projects(self, queryset, name, value):
        clean_value = str(value).rstrip('/').lower()
        if clean_value == 'true':
            user = self.request.user
            if not user.is_authenticated:
                return queryset.none()
            return queryset.filter(
                Q(owner=user) | Q(contributors=user)
            ).distinct()
        return queryset
    