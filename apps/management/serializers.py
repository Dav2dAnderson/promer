from rest_framework import serializers

from base.serializers import BaseSerializer

from apps.accounts.serializers import CustomUserSerializer
from apps.accounts.models import CustomUser

from .models import Project, Task, Application, Department, DepartmentMember, TaskComment


class ProjectListSerializer(BaseSerializer):
    owner = CustomUserSerializer(read_only=True)
    class Meta(BaseSerializer.Meta):
        model = Project
        fields = BaseSerializer.Meta.fields + ['id', 'name', 'slug', 'owner', 'is_public']


class ProjectDetailSerializer(BaseSerializer):
    owner = CustomUserSerializer(read_only=True)
    contributors = CustomUserSerializer(read_only=True, many=True)
    class Meta(BaseSerializer.Meta):
        model = Project
        fields = BaseSerializer.Meta.fields + ['id', 'name', 'slug', 'owner', 'description', 'is_public', 'contributors']


class ApplicationListSerializer(BaseSerializer):
    user = CustomUserSerializer(read_only=True)
    project = ProjectListSerializer(read_only=True)
    class Meta(BaseSerializer.Meta):
        model = Application
        fields = BaseSerializer.Meta.fields + ['id', 'title', 'slug', 'description', 'user', 'project', 'is_accepted']


class ApplicationDetailSerializer(BaseSerializer):
    project = ProjectListSerializer(read_only=True)
    user = CustomUserSerializer(read_only=True)
    class Meta(BaseSerializer.Meta):
        model = Application
        fields = BaseSerializer.Meta.fields + ['id', 'title', 'slug', 'description', 'user', 'project', 'is_accepted']


class TaskListSerializer(BaseSerializer):
    to_user = CustomUserSerializer(read_only=True)
    project = ProjectListSerializer(read_only=True)

    class Meta(BaseSerializer.Meta):
        model = Task
        fields = BaseSerializer.Meta.fields + ['id', 'title', 'slug', 'to_user', 'project']


class TaskDetailSerializer(BaseSerializer):
    to_user = CustomUserSerializer(read_only=True)
    from_user = CustomUserSerializer(read_only=True)
    project = ProjectListSerializer(read_only=True)

    class Meta(BaseSerializer.Meta):
        model = Task
        fields = BaseSerializer.Meta.fields + ['id', 'title', 'slug', 'description', 'to_user', 'from_user', 'project']
        read_only_fields = ['project', 'from_user', 'slug']


class TaskCommentSerializer(BaseSerializer):
    user = CustomUserSerializer(read_only=True)
    task = TaskListSerializer(read_only=True)
    class Meta(BaseSerializer.Meta):
        model = TaskComment
        fields = BaseSerializer.Meta.fields + ['id', 'content', 'file', 'task', 'user']
        read_only_fields = ['task', 'user']


class DepartmentMemberSerializer(BaseSerializer):
    user = CustomUserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.all(), source='user', write_only=True
    )
    class Meta(BaseSerializer.Meta):
        model = DepartmentMember
        fields = BaseSerializer.Meta.fields + ['id', 'user', 'user_id', 'role']


class DepartmentMembersDetailSerializer(BaseSerializer):
    user = CustomUserSerializer(read_only=True)
    class Meta(BaseSerializer.Meta):
        model = DepartmentMember
        fields = BaseSerializer.Meta.fields + ['id', 'user', 'role', 'department']
    

class DepartmentSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Department
        fields = BaseSerializer.Meta.fields + ['id', 'name', 'slug', 'project']
        read_only_fields = ['project']
