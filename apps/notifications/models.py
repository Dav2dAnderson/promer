from django.db import models

from base.models import BaseModel
# Create your models here.


class Notification(BaseModel):
    class Type(models.TextChoices):
        TASK_ASSIGNED = 'task_assigned', 'Task tayinlandi'
        TASK_COMPLETED = 'task_completed', 'Task bajarildi'
        PR_MERGED = 'pr_merged', 'PR merge qilindi'
        APPLICATION_ACCEPTED = 'application_accepted', 'Ariza qabul qilindi'
        APPLICATION_REJECTED = 'application_rejected', 'Ariza rad etildi'

    user = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=100)
    message = models.TextField()
    type = models.CharField(max_length=100, choices=Type.choices)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, null=True, blank=True)

    class Meta(BaseModel.Meta):
        abstract = False
        ordering = ['-created_at']
        indexes = BaseModel.Meta.indexes + [
            models.Index(fields=['user', 'is_read'])
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"
