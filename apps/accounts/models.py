from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

from base.models import BaseModel
# Create your models here.

class CustomUser(AbstractUser):
    phone_number = models.CharField(max_length=20) # productiondan oldin unique = True qo'shilsin\
    github_username = models.CharField(max_length=100, null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_manager = models.BooleanField(default=False)

    def delete(self, *args, **kwargs):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])
    
    def hard_delete(self, *args, **kwargs):
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'


class ManagerRequest(BaseModel):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    reason = models.TextField()
    is_approved = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username
    
    class Meta:
        verbose_name = 'Manager Request'
        verbose_name_plural = 'Manager Requests'