from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ManagerRequest


@receiver(post_save, sender=ManagerRequest)
def approve_manager(sender, instance, **kwargs):
    if instance.is_approved:
        instance.user.is_manager = True
        instance.user.save(update_fields=['is_manager'])