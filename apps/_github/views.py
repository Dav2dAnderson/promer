import hmac
import hashlib
import json
import logging
import secrets

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponseRedirect, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .api import get_user_repos
from .services import (
    GitHubWebhookSetupError,
    authenticate_github_user,
    connect_repo_to_project,
)

from apps.management.models import Task, TaskComment
from apps.management.permissions import IsManager
from apps.notifications.models import Notification
from apps.notifications.services import send_notification

User = get_user_model()
logger = logging.getLogger(__name__)


class GitHubOAuthStartView(APIView):
    """
    Initiates GitHub OAuth login flow.
    Generates a state parameter for CSRF protection and redirects to GitHub.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required

    def get(self, request):
        # Generate a cryptographically secure random state
        state = secrets.token_urlsafe(32)

        # Store state in cache with 10-minute expiry
        # This prevents replay attacks and ensures state is only used once
        cache.set(f'oauth_state_{state}', 'valid', timeout=600)

        # Build the GitHub authorization URL
        # Include: client_id, redirect_uri, scope, and state
        auth_url = (
            f"https://github.com/login/oauth/authorize"
            f"?client_id={settings.GITHUB_CLIENT_ID}"
            f"&redirect_uri={settings.GITHUB_REDIRECT_URI}"
            f"&scope={' '.join(settings.SOCIAL_AUTH_GITHUB_SCOPE)}"
            f"&state={state}"
        )

        logger.info(f"Initiating GitHub OAuth for state: {state}")
        # Redirect user's browser to GitHub
        return HttpResponseRedirect(auth_url)


class GitHubOAuthCallbackView(APIView):
    """
    Handles GitHub OAuth callback.
    Verifies state, exchanges code for tokens, and stores tokens in cache.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required

    def get(self, request):
        state = request.query_params.get('state')
        code = request.query_params.get('code')
        error = request.query_params.get('error')

        # Handle GitHub denial (user clicked "Cancel" on GitHub)
        if error:
            logger.warning(f"GitHub OAuth denied: {error}")
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}/login?error=github_denied")

        # Validate state parameter (CSRF protection)
        if not state:
            logger.warning("OAuth callback missing state parameter")
            return Response({"error": "State missing"}, status=status.HTTP_400_BAD_REQUEST)

        # Check if state exists in cache and is valid
        cached_state = cache.get(f'oauth_state_{state}')
        if not cached_state:
            logger.warning(f"OAuth callback invalid or expired state: {state}")
            return Response({"error": "Invalid or expired state"}, status=status.HTTP_400_BAD_REQUEST)

        # Consume the state (delete from cache) to prevent replay attacks
        cache.delete(f'oauth_state_{state}')
        logger.info(f"OAuth state validated and consumed: {state}")

        # Check for authorization code
        if not code:
            logger.warning("OAuth callback missing code parameter")
            return Response({"error": "Code missing"}, status=status.HTTP_400_BAD_REQUEST)

        # Authenticate user with GitHub
        result = authenticate_github_user(code)
        if not result:
            logger.error("GitHub authentication failed")
            return HttpResponseRedirect(f"{settings.FRONTEND_URL}/login?error=auth_failed")

        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(result['user'])

        logger.info(f"User authenticated via GitHub: {result['user'].username}, created: {result['created']}")

        # Store tokens in session temporarily
        session_key = f'oauth_tokens_{secrets.token_urlsafe(32)}'
        cache.set(session_key, {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'id': str(result['user'].id),
                'username': result['user'].username,
                'email': result['user'].email,
                'first_name': result['user'].first_name,
                'last_name': result['user'].last_name,
                'is_manager': result['user'].is_manager,
            },
        }, timeout=60)  # 1 minute expiry

        # Redirect to frontend with session key
        return HttpResponseRedirect(f"{settings.FRONTEND_URL}/auth/callback?session={session_key}")


class GitHubOAuthTokenView(APIView):
    """
    Retrieves OAuth tokens from cache using session key.
    Called by frontend after OAuth redirect.
    Returns tokens in response body for Authorization header auth.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required

    def get(self, request):
        session_key = request.query_params.get('session')

        if not session_key:
            return Response({"error": "Session key missing"}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve tokens from cache
        token_data = cache.get(session_key)

        if not token_data:
            return Response({"error": "Invalid or expired session"}, status=status.HTTP_400_BAD_REQUEST)

        # Consume the session (delete from cache)
        cache.delete(session_key)

        logger.info(f"Returning tokens for session {session_key}")

        # Return tokens in response body (not cookies)
        return Response({
            'access': token_data['access'],
            'refresh': token_data['refresh'],
            'user': token_data['user']
        })


class GitHubReposView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.github_access_token:
            return Response({'error': 'GitHub account is not connected'}, status=status.HTTP_400_BAD_REQUEST)

        repos = get_user_repos(request.user.github_access_token)
        return Response(repos)


class GitHubConnectRepoView(APIView):
    permission_classes = [IsAuthenticated, IsManager]

    def post(self, request):
        repo_full_name = request.data.get('repo_full_name')
        project_name = request.data.get('project_name')
        description = request.data.get('description', '')
        is_public = request.data.get('is_public', False)

        if not repo_full_name:
            return Response({"error": "repo_full_name is required"}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.github_access_token:
            return Response({"error": "GitHub account is not connected"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = connect_repo_to_project(
                user=request.user,
                repo_full_name=repo_full_name,
                project_name=project_name,
                description=description,
                is_public=is_public,
            )
        except GitHubWebhookSetupError:
            return Response(
                {
                    'error': (
                        'GitHub rejected webhook setup. Configure '
                        'GITHUB_WEBHOOK_URL as a publicly reachable URL and check '
                        "the backend logs for GitHub's validation response."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if result is None:
            return Response(
                {"error": "Failed to connect repository, or it belongs to another user."}, 
                status=status.HTTP_403_FORBIDDEN)

        return Response({
            'message': "Project created",
            'project': result,
        })


@method_decorator(csrf_exempt, name='dispatch')
class GitHubWebhookView(APIView):
    permission_classes = []
    authentication_classes = []  # No authentication required for webhooks

    def post(self, request):
        if request.content_type !=  'application/json':
            return Response(
                {"error": "Content-Type must be application/json"},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
            )

        raw_body = request.body
        signature = request.headers.get('X-Hub-Signature-256', '')

        if not signature:
            return Response({"error": "Missing Signature"}, status=status.HTTP_400_BAD_REQUEST)

        if not self._verify_signature(raw_body, signature):
            logger.warning("Invalid webhook signature - possible spoofing attempt")
            return Response({"error": "Invalid signature"}, status=status.HTTP_403_FORBIDDEN)

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except json.JSONDecodeError:
            return Response({"error": "Invalid"}, status=status.HTTP_400_BAD_REQUEST)

        event = request.headers.get('X-GitHub-Event', '')

        if event == 'push':
            self._handle_push(payload)
        elif event == 'pull_request':
            self._handle_pull_request(payload)
        else:
            logger.debug(f"Unhandled GitHub event: {event}")
        return Response({"message": "OK"})

    def _verify_signature(self, body, signature):
        if not signature:
            return False
        secret = settings.GITHUB_WEBHOOK_SECRET.encode()
        mac = hmac.new(secret, msg=body, digestmod=hashlib.sha256)
        expected = 'sha256=' + mac.hexdigest()
        return hmac.compare_digest(signature, expected)

    def _handle_push(self, payload):
        branch = payload.get('ref', '').replace('refs/heads/', '')
        pusher = payload.get('pusher', {}).get('name')
        commits = payload.get('commits', [])
        repo_full_name = payload.get('repository', {}).get('full_name')

        if not branch.startswith('task/'):
            return

        task_slug = branch.replace('task/', '')

        try:
            user = User.objects.get(github_username=pusher)
        except User.DoesNotExist:
            logger.warning(f"User topilmadi - github_username: {pusher}")
            return

        try:
            from apps.management.models import Project
            project = Project.objects.get(github_url__icontains=repo_full_name)
        except Project.DoesNotExist:
            logger.warning(f"Loyiha topilmadi: {repo_full_name}")
            return
        except Project.MultipleObjectsReturned:
            project = Project.objects.filter(
                github_url__icontains=repo_full_name
            ).first()

        try:
            task = Task.objects.get(slug=task_slug, project=project)
        except Task.DoesNotExist:
            logger.warning(f"Task topilmadi - slug: {task_slug}")
            return
            
        commit_messages = '\n'.join([
            f"- [{c['message']}]({c['url']})" for c in commits
        ])

        try:
            TaskComment.objects.create(
                task=task,
                user=user,
                content=f"**Pushed** - '{branch}' ('{repo_full_name}')\n\n{commit_messages}",
                github_url=payload.get('compare')
            )
        except Exception as e:
            logger.error(f"TaskComment yaratishda xato (push): {e}")

    def _handle_pull_request(self, payload):
        action = payload.get('action')
        pr = payload.get('pull_request', {})
        branch = pr.get('head', {}).get('ref', '')
        sender = payload.get('sender', {}).get('login')
        repo_full_name = payload.get('repository', {}).get('full_name')

        logger.debug(f"PR event - action: {action}, branch: {branch}, sender: {sender}")

        if not branch.startswith('task/'):
            return

        task_slug = branch.replace('task/', '')

        try:
            user = User.objects.get(github_username=sender)
        except User.DoesNotExist:
            logger.warning(f"User not found - github_username: {sender}")
            return

        try:
            from apps.management.models import Project  
            project = Project.objects.get(github_url__icontains=repo_full_name)
        except Project.DoesNotExist:
            logger.warning(f"Project not found: {repo_full_name}")
            return
        except Project.MultipleObjectsReturned:
            project = Project.objects.filter(
                github_url__icontains=repo_full_name
            ).first()

        try:
            task = Task.objects.get(slug=task_slug, project=project)
        except Task.DoesNotExist:
            logger.warning(f"Task not found - slug: {task_slug}")
            return

        if action == "opened":
            content = f"**PR opened** [{pr.get('title')}]({pr.get('html_url')})"

        elif action == "closed" and pr.get('merged'):
            content = "**PR merged** - task completed"
            try:
                task.status = 'done'
                task.save(update_fields=['status'])
                if task.from_user:
                    send_notification(
                        user=task.from_user,
                        title='PR merged',
                        message=f"PR for '{task.title}' merged into main.",
                        notification_type=Notification.Type.PR_MERGED,
                        link=f"/projects/{task.project.slug}/tasks/{task.slug}/",
                        send_email=False,
                    )
            except Exception as e:
                logger.error(f"Failed to update Task status: {e}")
                return
        else:
            return

        try:
            TaskComment.objects.create(
                task=task,
                user=user,
                content=content,
                github_url=pr.get('html_url')
            )
        except Exception as e:
            logger.error(f"Failed to create TaskComment: {e}")