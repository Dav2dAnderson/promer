from django.shortcuts import render

from dj_rest_auth.registration.views import RegisterView

from rest_framework import permissions, views, status
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema

from .permissions import IsNotAuthenticated
from .serializers import ManagerRequestSerializer

from .models import ManagerRequest
# Create your views here.

class CustomRegister(RegisterView):
    permission_classes = [IsNotAuthenticated]
    

class ManagerRequestView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="List manager requests",
        description="Returns all manager upgrade requests submitted by the currently authenticated user.",
        tags=["Manager Requests"],
        responses={200: ManagerRequestSerializer(many=True)},
    )
    def get(self, request):
        queryset = ManagerRequest.objects.filter(user=request.user)
        serializer = ManagerRequestSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Create a manager request",
        description=(
            "Submit a request to be upgraded to manager role. "
            "Returns 400 if the user is already a manager or has a pending request."
        ),
        tags=["Manager Requests"],
        request=ManagerRequestSerializer,
        responses={201: ManagerRequestSerializer},
    )
    def post(self, request):
        if request.user.is_manager:
            return Response(
                {'detail': 'You are already a manager.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if ManagerRequest.objects.filter(user=request.user, is_approved=False).exists():
            return Response(
                {'detail': 'You already have a pending request.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = ManagerRequestSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)