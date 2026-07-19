from rest_framework import serializers


class BaseSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['created_at']