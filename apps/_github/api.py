import json
import logging
import requests

from django.conf import settings

logger = logging.getLogger(__name__)


def get_github_access_token(code: str) -> str | None:
    """
    Exchanges GitHub authorization code for an access token.
    Must include the same redirect_uri used in the authorization request.
    """
    try:
        response = requests.post(
            'https://github.com/login/oauth/access_token',
            headers={'Accept': 'application/json'},
            data={
                'client_id': settings.GITHUB_CLIENT_ID,
                'client_secret': settings.GITHUB_CLIENT_SECRET,
                'code': code,
                'redirect_uri': settings.GITHUB_REDIRECT_URI,  # Must match authorization request
            },
            timeout=10,
        )
        response.raise_for_status()  # Raise exception for HTTP errors
        return response.json().get('access_token')
    except requests.RequestException as e:
        logger.error(f"GitHub token exchange failed: {e}")
        return None


def get_github_user(access_token: str) -> dict | None:
    """
    Fetches GitHub user profile using the access token.
    """
    try:
        response = requests.get(
            'https://api.github.com/user',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/vnd.github+json',
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.error(f"GitHub user fetch failed: {e}")
        return None


def get_user_repos(access_token: str) -> list:
    """
    Fetches repositories accessible to the authenticated user.
    Returns a list of repository dictionaries with key fields.
    """
    try:
        response = requests.get(
            'https://api.github.com/user/repos',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/vnd.github+json'
            },
            params={
                'type': 'owner',
                'sort': 'updated',
                'per_page': 100,
            },
            timeout=10,
        )
        response.raise_for_status()

        return [
            {
                'id': r['id'],
                'name': r['name'],
                'full_name': r['full_name'],
                'description': r['description'],
                'private': r['private'],
                'url': r['html_url']
            }
            for r in response.json()
        ]
    except (requests.RequestException, json.JSONDecodeError, KeyError, TypeError) as e:
        logger.error(f"GitHub repos fetch failed: {e}")
        return []


def setup_webhook(access_token: str, repo_full_name: str) -> bool:
    """
    Creates a webhook on the specified GitHub repository.
    The webhook will send push and pull_request events to the backend.
    """
    try:
        response = requests.post(
            f"https://api.github.com/repos/{repo_full_name}/hooks",
            headers={
                'Authorization': f"Bearer {access_token}",
                'Accept': 'application/vnd.github+json'
            },
            json={
                'name': 'web',
                'active': True,
                'events': ['push', 'pull_request'],
                'config': {
                    'url': settings.GITHUB_WEBHOOK_URL,
                    'content_type': 'json',
                    'secret': settings.GITHUB_WEBHOOK_SECRET,
                    'insecure_ssl': '0',
                }
            },
            timeout=10,
        )
        response.raise_for_status()
        logger.info(f"Webhook created successfully: {repo_full_name}")
        return True
    except requests.RequestException as e:
        response = e.response
        if response is not None:
            logger.error(
                "Webhook creation failed for %s (HTTP %s): %s",
                repo_full_name,
                response.status_code,
                response.text[:1000],
            )
        else:
            logger.error("Webhook creation failed for %s: %s", repo_full_name, e)
        return False


def delete_webhook(access_token: str, repo_full_name: str, hook_id: int) -> bool:
    """
    Deletes a webhook from the specified GitHub repository.
    """
    try:
        response = requests.delete(
            f"https://api.github.com/repos/{repo_full_name}/hooks/{hook_id}",
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/vnd.github+json',
            },
            timeout=10,
        )
        response.raise_for_status()
        logger.info(f"Webhook deleted: {repo_full_name}/{hook_id}")
        return True
    except requests.RequestException as e:
        logger.error(f"Webhook deletion failed for {repo_full_name}/{hook_id}: {e}")
        return False
