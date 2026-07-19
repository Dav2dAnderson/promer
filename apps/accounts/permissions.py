from rest_framework.permissions import BasePermission

class IsNotAuthenticated(BasePermission):
    message = "Log out to create a new account."

    def has_permission(self, request, view):
        return not request.user.is_authenticated
    
