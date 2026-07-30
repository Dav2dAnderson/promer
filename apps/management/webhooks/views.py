import hmac
import hashlib
import logging

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model

from rest_framework import views, status
from rest_framework.response import Response

from apps.management.models import Task, TaskComment

User = get_user_model()
logger = logging.getLogger(__name__)


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

    def post(self, request):
        # GitHub yuborgan HMAC-SHA256 imzosini tekshirish
        # Agar imzo noto'g'ri bo'lsa — so'rov soxta, 403 qaytaramiz
        signature = request.headers.get('X-Hub-Signature-256', '')
        if not self._verify_signature(request.body, signature):
            return Response({'error': 'Invalid signature'}, status=status.HTTP_403_FORBIDDEN)

        # GitHub event turini aniqlaymiz: 'push', 'pull_request', va h.k.
        event = request.headers.get('X-GitHub-Event', '')
        payload = request.data

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
        GitHub HMAC-SHA256 imzosini tekshiradi.

        GitHub har bir webhook so'rovini
        settings.GITHUB_WEBHOOK_SECRET bilan imzolaydi.
        Biz ham xuddi shu secret bilan hisoblаb, solishtiramiz.

        Args:
            body: So'rovning raw bytes body si
            signature: GitHub yuborgan 'X-Hub-Signature-256' header qiymati

        Returns:
            bool: Imzo to'g'ri bo'lsa True, aks holda False
        """
        if not signature:
            return False

        secret = settings.GITHUB_WEBHOOK_SECRET.encode()
        mac = hmac.new(secret, msg=body, digestmod=hashlib.sha256)
        expected = 'sha256=' + mac.hexdigest()

        # compare_digest — timing attack dan himoya qiladi
        return hmac.compare_digest(signature, expected)

    def _handle_push(self, payload):
        """
        GitHub push eventini qayta ishlaydi.

        Faqat 'task/' prefiksi bilan boshlangan branchlarni kuzatadi.
        Masalan: git push origin task/login-page

        Branch nomi: task/{task_slug} formatida bo'lishi kerak.
        User ning github_username si GitHub pusher nomi bilan mos kelishi kerak.

        Muvaffaqiyatli bo'lsa — tegishli Task ga TaskComment yaratiladi:
            "Push qilindi - `task/login-page` (`owner/repo`)
            - [commit message](commit url)"
        """
        branch = payload.get('ref', '').replace('refs/heads/', '')
        pusher = payload.get('pusher', {}).get('name')
        commits = payload.get('commits', [])
        repo = payload.get('repository', {}).get('full_name')

        # Faqat task/ branch larini kuzatamiz
        if not branch.startswith('task/'):
            return

        # branch: "task/login-page" → task_slug: "login-page"
        task_slug = branch.replace('task/', '')

        # Pusher ning github_username si orqali User ni topamiz
        try:
            user = User.objects.get(github_username=pusher)
        except User.DoesNotExist:
            logger.warning(f"User topilmadi — github_username: {pusher}")
            return

        # Task slug orqali Task ni topamiz
        try:
            task = Task.objects.get(slug=task_slug)
        except Task.DoesNotExist:
            logger.warning(f"Task topilmadi — slug: {task_slug}")
            return

        # Barcha commit xabarlarini markdown formatida birlashtirамиз
        commit_messages = '\n'.join([
            f"- [{c['message']}]({c['url']})" for c in commits
        ])

        try:
            TaskComment.objects.create(
                task=task,
                user=user,
                content=f"**Push qilindi** - `{branch}` (`{repo}`)\n\n{commit_messages}",
                github_url=payload.get('compare')  # push dagi barcha commitlar linki
            )
        except Exception as e:
            logger.error(f"TaskComment yaratishda xato (push): {e}")

    def _handle_pull_request(self, payload):
        """
        GitHub pull_request eventini qayta ishlaydi.

        Kuzatiladigan actionlar:
            - 'opened'         → PR ochildi — comment yaratiladi
            - 'closed'+merged  → PR merge qilindi — task.is_done=True, comment yaratiladi
            - boshqalar        → e'tiborsiz qoldiriladi

        Branch nomi: task/{task_slug} formatida bo'lishi kerak.
        User ning github_username si GitHub sender login i bilan mos kelishi kerak.
        """
        action = payload.get('action')
        pr = payload.get('pull_request', {})
        branch = pr.get('head', {}).get('ref', '')
        sender = payload.get('sender', {}).get('login')

        # Faqat task/ branch larini kuzatamiz
        if not branch.startswith('task/'):
            return

        # branch: "task/login-page" → task_slug: "login-page"
        task_slug = branch.replace('task/', '')

        # PR ochgan user ni topamiz
        try:
            user = User.objects.get(github_username=sender)
        except User.DoesNotExist:
            logger.warning(f"User topilmadi — github_username: {sender}")
            return

        # Task ni topamiz
        try:
            task = Task.objects.get(slug=task_slug)
        except Task.DoesNotExist:
            logger.warning(f"Task topilmadi — slug: {task_slug}")
            return

        if action == 'opened':
            # PR yangi ochildi — faqat comment qo'shamiz
            content = f"**PR ochildi:** [{pr.get('title')}]({pr.get('html_url')})"

        elif action == 'closed' and pr.get('merged'):
            # PR merge qilindi — task ni done qilamiz va comment qo'shamiz
            content = "**PR merge qilindi** — task bajarildi."
            try:
                task.is_done = True
                task.save(update_fields=['is_done'])
            except Exception as e:
                logger.error(f"Task.is_done yangilashda xato: {e}")
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
            logger.error(f"TaskComment yaratishda xato (PR): {e}")