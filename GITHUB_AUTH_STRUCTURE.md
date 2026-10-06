# GitHub Authentication Structure

The GitHub authentication is implemented using OAuth 2.0 flow with a custom backend integration. Here's the complete structure:

## Architecture Overview

The authentication flow spans three main layers:
1. **Frontend** (Next.js) - Initiates OAuth and handles tokens
2. **Backend** (Django REST Framework) - Manages OAuth flow and user authentication
3. **GitHub API** - Provides OAuth and user data

---

## 1. Backend Structure (`apps/_github/`)

### Core Files

### `apps/_github/views.py` - API Views

**`GitHubOAuthStartView`** (lines 30-58)
- Initiates OAuth flow
- Generates secure state parameter for CSRF protection
- Redirects to GitHub authorization URL

**`GitHubOAuthCallbackView`** (lines 61-127)
- Handles GitHub OAuth callback
- Verifies state parameter (CSRF protection)
- Exchanges authorization code for access token
- Generates JWT tokens for user
- Stores tokens in cache temporarily
- Redirects to frontend with session key

**`GitHubOAuthTokenView`** (lines 130-161)
- Retrieves OAuth tokens from cache using session key
- Called by frontend after OAuth redirect
- Returns tokens in response body for Authorization header auth

**`GitHubReposView`** (lines 164-172)
- Fetches user's GitHub repositories
- Requires authentication
- Uses stored `github_access_token`

**`GitHubConnectRepoView`** (lines 175-202)
- Connects GitHub repository to project
- Sets up webhook on the repository
- Validates ownership

**`GitHubWebhookView`** (lines 205-366)
- Handles GitHub webhooks (push and pull_request events)
- Verifies webhook signature for security
- Creates task comments on push events
- Updates task status on PR merge

### `apps/_github/api.py` - GitHub API Interactions

**`get_github_access_token(code: str)`** (lines 10-31)
- Exchanges GitHub authorization code for an access token
- Makes POST request to GitHub's token endpoint
- Includes client_id, client_secret, code, and redirect_uri
- Returns access token or None on failure

**`get_github_user(access_token: str)`** (lines 34-51)
- Fetches GitHub user profile using the access token
- Makes GET request to GitHub's user API
- Returns user data (login, email, name) or None on failure

**`get_user_repos(access_token: str)`** (lines 54-88)
- Fetches repositories accessible to the authenticated user
- Returns list of repository dictionaries with key fields
- Filters by owner, sorts by updated, limits to 100 repos

**`setup_webhook(access_token: str, repo_full_name: str)`** (lines 91-121)
- Creates a webhook on the specified GitHub repository
- Subscribes to push and pull_request events
- Points webhook to backend's webhook endpoint
- Uses webhook secret for signature verification

**`delete_webhook(access_token: str, repo_full_name: str, hook_id: int)`** (lines 124-142)
- Deletes a webhook from the specified GitHub repository
- Used for cleanup when disconnecting repos

### `apps/_github/services.py` - Business Logic

**`authenticate_github_user(code: str)`** (lines 12-51)
- Main authentication logic
- Exchanges code for access token
- Fetches GitHub user info
- Creates or updates user based on GitHub username
- Stores GitHub access token in user model
- Returns dict with user and created flag

**`connect_repo_to_project(user, repo_full_name: str, project_name: str)`** (lines 54-96)
- Connects GitHub repository to project
- Checks if repo already connected (prevents duplicates)
- Validates ownership (user must own the repo)
- Sets up webhook on the repository
- Creates new Project if needed
- Returns project data or None on failure

### `apps/_github/urls.py` - URL Routes

```python
/api/github/login/         → GitHubOAuthStartView (OAuth start)
/api/github/callback/      → GitHubOAuthCallbackView (OAuth callback)
/api/github/token/         → GitHubOAuthTokenView (Token retrieval)
/api/github/repos/         → GitHubReposView (Get repositories)
/api/github/connect-repo/  → GitHubConnectRepoView (Connect repo)
/api/github/webhook/       → GitHubWebhookView (Webhook handler)
```

---

## 2. OAuth Flow Steps

### Step 1: Initiation (Frontend → Backend → GitHub)

1. User clicks "Login with GitHub" on frontend
2. Frontend calls `githubLogin()` in `AuthContext.tsx` (lines 94-98)
3. Frontend redirects to `/api/github/login/`
4. Backend generates cryptographically secure state parameter (32 bytes)
5. Backend stores state in cache with 10-minute expiry
6. Backend builds GitHub authorization URL with:
   - client_id
   - redirect_uri
   - scope (repo, admin:repo_hook)
   - state parameter
7. Backend redirects user's browser to GitHub

### Step 2: User Authorization (GitHub)

1. User sees GitHub authorization page
2. User grants or denies permissions
3. If denied: GitHub redirects with error parameter

### Step 3: Callback (GitHub → Backend)

1. GitHub redirects to `/api/github/callback/` with:
   - `code`: authorization code
   - `state`: state parameter from step 1
2. Backend validates state parameter:
   - Checks if state exists in cache
   - Prevents CSRF attacks
   - Consumes state (deletes from cache) to prevent replay attacks
3. Backend exchanges authorization code for access token:
   - POST to GitHub's token endpoint
   - Includes client_id, client_secret, code, redirect_uri
4. Backend fetches GitHub user info using access token
5. Backend creates or updates user in database:
   - Uses GitHub username as unique identifier
   - Populates email, first_name, last_name from GitHub
   - Stores github_access_token for future API calls
6. Backend generates JWT tokens (access + refresh)
7. Backend stores tokens in cache with 1-minute expiry
8. Backend redirects to frontend with session key

### Step 4: Token Retrieval (Frontend → Backend)

1. Frontend makes GET request to `/api/github/token/?session=...`
2. Backend retrieves tokens from cache using session key
3. Backend consumes session (deletes from cache)
4. Backend returns tokens in response body:
   - access token
   - refresh token
   - user data
5. Frontend stores tokens for API authentication

---

## 3. Data Model

The `CustomUser` model in `apps/accounts/models.py` stores GitHub credentials:

- `github_username` (line 10): GitHub username for user identification
  - Used as unique identifier for GitHub users
  - Maps GitHub login to local user account

- `github_access_token` (line 11): OAuth access token for API calls
  - Stored securely in database
  - Used for GitHub API operations (fetch repos, setup webhooks)
  - Can be used to make authenticated requests to GitHub on behalf of user

---

## 4. Configuration

Configuration in `config/settings.py`:

- `GITHUB_CLIENT_ID` (line 123): GitHub OAuth app client ID
  - Required for OAuth flow
  - Retrieved from GitHub OAuth app settings

- `GITHUB_CLIENT_SECRET` (line 124): GitHub OAuth app client secret
  - Required for token exchange
  - Must be kept secret (use environment variables)

- `BACKEND_URL` (line 125): Backend server URL
  - Used to construct redirect_uri
  - Default: http://127.0.0.1:8000

- `GITHUB_REDIRECT_URI` (lines 126-129): OAuth callback URL
  - Must match GitHub OAuth app settings
  - Format: {BACKEND_URL}/api/github/callback/

- `FRONTEND_URL` (line 130): Frontend server URL
  - Used for redirect after OAuth completion
  - Default: http://localhost:3000

- `SOCIAL_AUTH_GITHUB_SCOPE` (line 132): OAuth scopes
  - `repo`: Full repository access
  - `admin:repo_hook`: Manage repository webhooks
  - Required for repository operations and webhook setup

---

## 5. Security Features

### 1. State Parameter (CSRF Protection)
- Cryptographically secure random state (32 bytes)
- Generated using `secrets.token_urlsafe(32)`
- Stored in cache with 10-minute expiry
- Must match between authorization request and callback
- Prevents CSRF attacks

### 2. State Consumption
- State is deleted from cache after validation
- Prevents replay attacks
- Each state can only be used once

### 3. Token Expiry
- OAuth tokens stored in cache with 1-minute expiry
- Short window reduces risk of token interception
- Tokens are consumed (deleted) after retrieval

### 4. Webhook Signature Verification
- HMAC-SHA256 signature validation
- Secret must match between GitHub and backend
- Prevents webhook spoofing
- Uses `hmac.compare_digest()` for constant-time comparison

### 5. Error Handling
- Handles GitHub denial (user cancels)
- Validates all required parameters
- Logs all authentication attempts
- Returns appropriate HTTP status codes

---

## 6. Webhook Integration

The system listens for GitHub events to integrate with task management:

### Push Events
- Triggered when code is pushed to repository
- Only processes pushes to `task/*` branches
- Extracts task slug from branch name (e.g., `task/my-task` → `my-task`)
- Matches pusher's GitHub username to local user
- Matches repository to project via `github_url`
- Creates TaskComment with commit messages
- Links to GitHub compare URL

### Pull Request Events
- Triggered on PR actions (opened, closed, merged)
- Only processes PRs from `task/*` branches
- On PR opened: Creates comment with PR title and link
- On PR merged:
  - Updates task status to 'done'
  - Creates comment indicating task completion
  - Sends notification to task creator
- Links to GitHub PR URL

### Webhook Setup
- Automatically created when connecting repository
- Subscribes to `push` and `pull_request` events
- Points to backend's `/api/github/webhook/` endpoint
- Uses shared secret for signature verification
- Configured with JSON content type

---

## 7. Frontend Integration

### AuthContext (`frontend/context/AuthContext.tsx`)

**`githubLogin()`** (lines 94-98)
- Redirects to backend OAuth start endpoint
- Uses `NEXT_PUBLIC_BACKEND_URL` environment variable
- Initiates the OAuth flow

**OAuth Error Handling** (lines 29-43)
- Checks URL for error parameters on mount
- Handles `github_denied` error
- Handles `auth_failed` error
- Cleans up URL after processing errors

### Callback Page (`frontend/app/auth/callback/page.tsx`)

- Receives session key from backend redirect
- Calls `/api/github/token/` to retrieve tokens
- Stores tokens in application state
- Redirects to appropriate page after authentication

---

## 8. Related Models

### Project Model (`apps/management/models.py`)
- `github_url`: Stores GitHub repository URL
- Used to match webhook events to projects
- Filtered via `icontains` for flexibility

### Task Model (`apps/management/models.py`)
- `slug`: Used to match GitHub branch names
- Branch naming convention: `task/{task_slug}`
- Status updated to 'done' on PR merge

### TaskComment Model (`apps/management/models.py`)
- `github_url`: Stores link to GitHub commit/PR
- Automatically created on webhook events
- Links task management to GitHub activity

---

## 9. Environment Variables Required

```
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
BACKEND_URL=http://127.0.0.1:8000
FRONTEND_URL=http://localhost:3000
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

---

## 10. Testing the OAuth Flow

1. Ensure GitHub OAuth app is configured with correct redirect URI
2. Set environment variables in `.env` file
3. Start backend server
4. Start frontend server
5. Navigate to login page
6. Click "Login with GitHub"
7. Authorize the application on GitHub
8. Verify user is created/updated in database
9. Verify tokens are stored and used for API calls
10. Test repository connection and webhook setup

---

## 11. Troubleshooting

### OAuth callback fails
- Check GITHUB_REDIRECT_URI matches GitHub app settings
- Verify state parameter is being generated and validated
- Check cache backend is working (required for state storage)

### Token exchange fails
- Verify GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are correct
- Check GitHub OAuth app is not in development mode (if testing with non-developer accounts)
- Ensure authorization code is not expired

### Webhook signature verification fails
- Verify GITHUB_WEBHOOK_SECRET matches between GitHub and backend
- Check webhook secret is not empty
- Ensure secret is encoded correctly (bytes vs string)

### User not found on webhook events
- Verify user's github_username matches GitHub login
- Check user has github_access_token stored
- Ensure webhook sender is the authenticated GitHub user

---

*This file documents the GitHub authentication structure. It should be updated when changes are made to the authentication flow, data models, or related functionality.*
