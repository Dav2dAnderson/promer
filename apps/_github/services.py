import logging

from django.contrib.auth import get_user_model

from .api import get_github_access_token, get_github_user, setup_webhook

User = get_user_model()

logger = logging.getLogger(__name__)


class GitHubWebhookSetupError(Exception):
    pass


def authenticate_github_user(code: str) -> dict | None:
    """
    Authenticates a user via GitHub OAuth.
    Exchanges the authorization code for an access token, fetches GitHub user info,
    and creates or updates the local user account.

    Returns:
        dict with 'user' and 'created' keys, or None on failure
    """
    access_token = get_github_access_token(code)
    if not access_token:
        logger.error("Failed to obtain GitHub access token")
        return None

    github_user = get_github_user(access_token)
    if not github_user:
        logger.error("Failed to fetch GitHub user info")
        return None

    # Create or update user based on GitHub username
    user, created = User.objects.get_or_create(
        github_username=github_user['login'],
        defaults={
            'username': github_user['login'],
            'email': github_user.get('email') or '',
            'first_name': (github_user.get('name') or '').split(' ')[0],
            'last_name': ' '.join((github_user.get('name') or '').split(' ')[1:]),
        }
    )

    # Store GitHub access token for repository operations
    user.github_access_token = access_token
    user.save(update_fields=['github_access_token'])

    logger.info(f"GitHub user authenticated: {github_user['login']}, created: {created}")

    return {
        'user': user,
        'created': created,
    }


def connect_repo_to_project(
    user,
    repo_full_name: str,
    project_name: str = None,
    description: str = '',
    is_public: bool = False,
) -> dict | None:
    if not user.github_access_token:
        return None

    from apps.management.models import Project

    github_url = f'https://github.com/{repo_full_name}'

    existing = Project.objects.filter(github_url=github_url).first()
    if existing:
        if existing.owner != user:
            return None
        return {
            'id': str(existing.id),
            'name': existing.name,
            'slug': existing.slug,
            'github_url': existing.github_url,
            'created': False,
        }

    webhook_ok = setup_webhook(
        access_token=user.github_access_token,
        repo_full_name=repo_full_name,
    )
    if not webhook_ok:
        raise GitHubWebhookSetupError


    name = project_name or repo_full_name.split('/')[-1]

    project = Project.objects.create(
        github_url=github_url,
        name=name,
        description=description,
        owner=user,
        is_public=is_public,
    )
    
    return {
        'id': str(project.id),
        'name': project.name,
        'slug': project.slug,
        'github_url': project.github_url
    }