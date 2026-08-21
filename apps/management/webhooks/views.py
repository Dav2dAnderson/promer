import hmac
import hashlib
import logging
import json

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model

from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.management.models import Task, TaskComment
from apps.notifications.models import Notification
from apps.notifications.services import send_notification

User = get_user_model()
logger = logging.getLogger(__name__)


class WebhookRateThrottle(AnonRateThrottle):
    rate = '30/minute'

@method_decorator(csrf_exempt, name='dispatch')
class GitHubWebHookView(views.APIView):
    """
    GitHub Webhook endpoint.

    GitHub dan kelgan push va pull_request eventlarini qabul qiladi.
    Har bir event uchun tegishli TaskComment yaratadi.

    Sozlash:
        GitHub repo → Settings → Webhooks → Add webhook
        Payload URL: https://your-domain.com/api/webhooks/github/
        Content type: application/json
        Secret: settings.GITHUB_WEBHOOK_SECRET
        Events: Pushes, Pull requests
    """
    permission_classes = []
    throttle_classes = [WebhookRateThrottle]

    def post(self, request):
        # GitHub yuborgan HMAC-SHA256 imzosini tekshirish
        # Agar imzo noto'g'ri bo'lsa — so'rov soxta, 403 qaytaramiz

        if request.content_type != 'application/json':
            return Response(
                {'error': 'Content-Type must be application/json'},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
            )

        raw_body = request.body
        signature = request.headers.get('X-Hub-Signature-256', '')

        if not signature or not self._verify_signature(raw_body, signature):
            logger.warning("GitHub webhook request rejected: Invalid or missing signature header.")
            return Response({'error': 'Invalid or missing signature'}, status=status.HTTP_403_FORBIDDEN)

        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except json.JSONDecodeError:
            return Response({"error": "Invalid JSON payload"}, status=status.HTTP_400_BAD_REQUEST)

        # GitHub event turini aniqlaymiz: 'push', 'pull_request', va h.k.
        event = request.headers.get('X-GitHub-Event', '')

        if event == 'push':
            self._handle_push(payload)
        elif event == 'pull_request':
            self._handle_pull_request(payload)
        else:
            # Boshqa eventlar (ping, star, va h.k.) — e'tiborsiz qoldiramiz
            logger.debug(f"Unhandled GitHub event: {event}")

        # GitHub 200 olmasa qayta urinadi — shuning uchun har doim 200 qaytaramiz
        return Response({'message': 'OK'}, status=status.HTTP_200_OK)

    def _verify_signature(self, body, signature):
        """
        GitHub HMAC-SHA256 imzosini xavfsiz tekshiradi.
        """

        secret_key = getattr(settings, 'GITHUB_WEBHOOK_SECRET', None)
        if not secret_key or not signature.startswith('sha256='):
            return False
        
        secret = secret_key.encode()
        mac = hmac.new(secret, msg=body, digestmod=hashlib.sha256)
        expected = 'sha256=' + mac.hexdigest()

        # compare_digest — timing attack dan himoya qiladi
        return hmac.compare_digest(signature, expected)

    def _handle_push(self, payload):
        branch = payload.get('ref', '').replace('refs/heads/', '')
        pusher = payload.get('pusher', {}).get('name')
        commits = payload.get('commits', [])
        repo_full_name = payload.get('repository', {}).get('full_name')

        # Faqat task/ branch larini kuzatamiz
        if not branch.startswith('task/'):
            return

        # branch: "task/login-page" → task_slug: "login-page"
        task_slug = branch.replace('task/', '')

        # Pusher ning github_username si orqali User ni topamiz
        try:
            user = User.objects.get(github_username=pusher)
        except User.DoesNotExist:
            logger.warning(f"User not found — github_username: {pusher}")
            return

        try:
            from apps.management.models import Project
            project = Project.objects.get(github_url__icontains=repo_full_name)
        except Project.DoesNotExist:
            logger.warning(f"Project not found - github_repo: {repo_full_name}")
            return
        except Project.MultipleObjectsReturned:
            project = Project.objects.filter(github_url__icontains=repo_full_name).first()


        # Task slug orqali Task ni topamiz
        try:
            task = Task.objects.get(slug=task_slug, project=project)
        except Task.DoesNotExist:
            logger.warning(f"Task not found — slug: {task_slug}, repo: {project}")
            return

        # Barcha commit xabarlarini markdown formatida birlashtirамиз
        commit_messages = '\n'.join([
            f"- [{c['message']}]({c['url']})" for c in commits
        ])

        try:
            TaskComment.objects.create(
                task=task,
                user=user,
                content=f"**Pushed** - `{branch}` (`{repo_full_name}`)\n\n{commit_messages}",
                github_url=payload.get('compare')  # push dagi barcha commitlar linki
            )
        except Exception as e:
            logger.error(f"Error in creating TaskComment (push): {e}")

    def _handle_pull_request(self, payload):
        action = payload.get('action')
        pr = payload.get('pull_request', {})
        branch = pr.get('head', {}).get('ref', '')
        sender = payload.get('sender', {}).get('login')
        repo_full_name = payload.get('repository', {}).get('full_name')

        logger.debug(f"PR event — action: {action}, branch: {branch}, sender: {sender}")

        # Faqat task/ branch larini kuzatamiz
        if not branch.startswith('task/'):
            return

        # branch: "task/login-page" → task_slug: "login-page"
        task_slug = branch.replace('task/', '')

        # PR ochgan user ni topamiz
        try:
            user = User.objects.get(github_username=sender)
        except User.DoesNotExist:
            logger.warning(f"User not found — github_username: {sender}")
            return

        try:
            from apps.management.models import Project
            project = Project.objects.get(github_url__icontains=repo_full_name)
        except Project.DoesNotExist:
            logger.warning(f"Loyiha topilmadi - github_repo: {repo_full_name}")
            return
        except Project.MultipleObjectsReturned:
            project = Project.objects.filter(github_url__icontains=repo_full_name).first()

        # Task ni topamiz
        try:
            task = Task.objects.get(slug=task_slug, project=project)
        except Task.DoesNotExist:
            logger.warning(f"Task not found — slug: {task_slug}, repo: {project}")
            return

        if action == 'opened':
            # PR yangi ochildi — faqat comment qo'shamiz
            content = f"**PR opened:** [{pr.get('title')}]({pr.get('html_url')})"

        elif action == 'closed' and pr.get('merged'):
            content = "**PR merged** — task bajarildi."
            try:
                task.status = 'done'
                task.save(update_fields=['status'])  # is_done emas, status

                # Notification
                if task.to_user:
                    send_notification(
                        user=task.from_user,
                        title='Merged into main.',
                        message=f"PR for {task.title} merged into main branch",
                        notification_type=Notification.Type.PR_MERGED,
                        link=f"/projects/{task.project.slug}/tasks/{task.slug}/",
                        send_email=False,
                    )
            except Exception as e:
                logger.error(f"Error in updating Task.status: {e}")
                return
        else:
            # 'closed' (merged emas), 'reopened', va h.k. — e'tiborsiz
            return

        try:
            TaskComment.objects.create(
                task=task,
                user=user,
                content=content,
                github_url=pr.get('html_url')
            )
        except Exception as e:
            logger.error(f"Error in creating TaskComment (PR): {e}")