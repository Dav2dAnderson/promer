from django.contrib import admin

from .models import Project, Task, Application, TaskComment, ProjectMember
# Register your models here.


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['id','name', 'owner', 'created_at', 'is_deleted']

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'from_user', 'to_user', 'project', 'created_at']

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'project', 'is_accepted', 'created_at']

@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'created_at']

@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ['project', 'user', 'role']