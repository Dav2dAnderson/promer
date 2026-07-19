from django.contrib import admin

from .models import CustomUser, ManagerRequest
# Register your models here.


@admin.register(CustomUser)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'first_name', 'last_name', 'phone_number', 'email']


@admin.register(ManagerRequest)
class ManagerRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'is_approved']

    