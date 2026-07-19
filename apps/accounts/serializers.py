from dj_rest_auth.serializers import JWTSerializer as BaseJWTSerializer
from dj_rest_auth.registration.serializers import RegisterSerializer

from rest_framework import serializers

from django.contrib.auth import get_user_model

from .models import ManagerRequest

User = get_user_model()

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'phone_number', 'is_manager')


class CustomJWTSerializer(BaseJWTSerializer):
    user = CustomUserSerializer(read_only=True)


class CustomUserDetailSerializer(serializers.ModelSerializer):
    created_projects = serializers.SerializerMethodField()
    assigned_tasks = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'phone_number', 'is_manager', 'assigned_tasks', 'created_projects')

    def get_assigned_tasks(self, obj):
        from apps.management.serializers import TaskListSerializer
        tasks = obj.assigned_tasks.all()
        return TaskListSerializer(tasks, many=True).data
    
    def get_created_projects(self, obj):
        from apps.management.serializers import ProjectListSerializer
        projects = obj.projects.all()
        return ProjectListSerializer(projects, many=True).data


class CustomRegisterSerializer(RegisterSerializer):
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    phone_number = serializers.CharField(required=True, max_length=20)

    def get_cleaned_data(self):
        data = super().get_cleaned_data()

        data['first_name'] = self.validated_data.get('first_name', '')
        data['last_name'] = self.validated_data.get('last_name', '')
        data['phone_number'] = self.validated_data.get('phone_number', '')
        
        return data

    def save(self, request):
        user = super().save(request)

        user.first_name = self.cleaned_data.get('first_name')
        user.last_name = self.cleaned_data.get('last_name')
        user.phone_number = self.cleaned_data.get('phone_number')
        user.save()

        return user
    

class ManagerRequestSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(read_only=True)
    class Meta:
        model = ManagerRequest
        fields = ('id', 'reason', 'user')