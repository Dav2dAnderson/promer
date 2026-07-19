import hmac
import hashlib

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model

from rest_framework import views, status
from rest_framework.response import Response

from apps.management.models import Task, TaskComment

User = get_user_model()

@method_decorator(csrf_exempt, name='dispatch')
class GitHubWebHookView(views.APIView):
    permission_clasess = []

    def post(self, request):
        signature = request.headers.get('X-Hub-Signature-256', '')
        if not self._verify_signature(request.body, signature):
            return Response({'error': 'Invalid signature'}, status=status.HTTP_400_BAD_REQUEST)
        
        event = request.headers.get('X-GitHub-Event', '')
        payload = request.data

        if event == 'push':
            self._handle_push(payload)
        elif event == 'pull_request':
            self._handle_pull_request(payload)

        return Response({'message': 'OK'}, status=status.HTTP_200_OK)
        print("Event {event} handled successfully")

    def _verify_signature(self, body, signature):
        secret = settings.GITHUB_WEBHOOK_SECRET.encode()
        expected = 'sha256=' + hmac.new(secret, body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(signature, expected)

    def _handle_push(self, payload):
        branch = payload.get('ref', '').replace('refs/heads/', '')
        pusher = payload.get('pusher', {}).get('name')
        commits = payload.get('commits', [])
        repo = payload.get('repository', {}).get('full_name')
        
        # branch: "task/login-page" -> task_slug: "login-page"
        if not branch.startswith('task/'):
            return
        task_slug = branch.replace('task/', '')

        try:
            user = User.objects.get(github_username=pusher)
            task = Task.objects.get(slug=task_slug)
        except (User.DoesNotExist, Task.DoesNotExist):
            return

        commit_messages = '\n'.join([
            f"- [{c['message']}]({c['url']})" for c in commits
        ])

        TaskComment.objects.create(
            task=task,
            user=user,
            content=f"**Push qilindi** - '{branch}' ('{repo}')\n\n{commit_messages}",
            github_url=payload.get('compare')
        )

    def _handle_pull_request(self, payload):
        action = payload.get('action')
        pr = payload.get('pull_request', {})
        branch = pr.get('head', {}).get('ref', '')
        sender = payload.get('sender', {}).get('login')

        if not branch.startswith('task/'):
            return
        task_slug = branch.replace('task/', '')

        try:
            user = User.objects.get(github_username=sender)
            task = Task.objects.get(slug=task_slug)
        except (User.DoesNotExist, Task.DoesNotExist):
            return
        
        if action == 'opened':
            content = f"**PR ochildi:** [{pr.get('title')}]({pr.get('html_url')})"
        elif action == 'closed' and pr.get('merged'):
            content = f"**PR merge qilindi** - task bajarildi."
            task.is_done = True
            task.save(update_fields=['is_done'])
        else:
            return
        
        TaskComment.objects.create(
            task=task,
            user=user,
            content=content,
            github_url=pr.get('html_url')
        )