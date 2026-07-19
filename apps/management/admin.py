from django.contrib import admin

from .models import Project, Task, Application, Department, DepartmentMember, TaskComment
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

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'project']

@admin.register(DepartmentMember)
class DepartmentMemberAdmin(admin.ModelAdmin):
    list_display = ['department', 'user', 'role']


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'created_at']
    