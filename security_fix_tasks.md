# Security Fix Tasks

## Priority 1: Critical / High

### 1. Harden WebSocket JWT authentication
- [ ] Remove JWT token extraction from query string in `apps/notifications/middleware.py`.
- [ ] Require auth from the WebSocket `Authorization` header or a secure cookie-based mechanism.
- [ ] Reject unauthenticated connections with a proper close code (e.g. `4401` or the project’s agreed `4001` convention).
- [ ] Ensure `scope['user']` is only set after token validation succeeds.
- [ ] Log invalid token attempts without exposing the raw token value.

### 2. Fix JWT configuration
- [ ] Reduce `ACCESS_TOKEN_LIFETIME` to 10 minutes or less.
- [ ] Keep refresh token rotation enabled and blacklist reused tokens.
- [ ] Set `JWT_AUTH_HTTPONLY` to `True` for cookie-based authentication.
- [ ] Review whether access tokens are being stored in JS-accessible cookies or local storage.
- [ ] Rotate any exposed JWT secrets and ensure they are generated securely.

### 3. Harden production environment
- [ ] Set `DEBUG = False` in production.
- [ ] Restrict `ALLOWED_HOSTS` to real production domains only.
- [ ] Make sure `SECRET_KEY` is a strong randomly generated value stored in `.env`.
- [ ] Ensure `.env` stays untracked via `.gitignore`.
- [ ] Validate `REDIS_URL` and channel layer configuration for production deployments.

### 4. Strengthen webhook validation
- [ ] Keep signature verification with `hmac.compare_digest` as the standard.
- [ ] Reject empty, missing, or malformed `X-Hub-Signature-256` headers.
- [ ] Validate `Content-Type` is `application/json` before processing payloads.
- [ ] Return a 415/400 for invalid content type rather than accepting payloads silently.
- [ ] Add rate limiting or IP restrictions for the GitHub webhook endpoint if needed.

### 5. Add API throttling
- [ ] Configure DRF throttling for auth, login, and registration endpoints.
- [ ] Add separate throttle rates for anonymous and authenticated users.
- [ ] Ensure sensitive endpoints cannot be abused by brute-force or replay attempts.

## Priority 2: Medium

### 6. Review CORS and access controls
- [ ] Confirm `CORS_ALLOW_ALL_ORIGINS` is never enabled in production.
- [ ] Keep `CORS_ALLOWED_ORIGINS` restricted to trusted frontend domains only.
- [ ] Review endpoints using `AllowAny` and verify they are truly public.
- [ ] Ensure object-level permission checks are applied where data is user-specific.

### 7. Database safety improvements
- [ ] Add `ATOMIC_REQUESTS = True` for safer transaction handling.
- [ ] Audit for raw SQL usage and remove or parameterize any unsafe queries.
- [ ] Review whether UUID primary keys or other non-enumerable identifiers are needed.
- [ ] Implement soft delete for destructive operations if accidental data loss is a risk.

## Priority 3: Cleanup / Hardening

### 8. Notification channel security
- [ ] Keep group names scoped to the user ID and avoid raw interpolation from external input.
- [ ] Sanitize any dynamic group names before use in `group_add` or `group_send`.
- [ ] Verify notification dispatch does not leak unauthorized information to the wrong user.

### 9. Security review follow-up
- [ ] Run Django security checks (`python manage.py check --deploy`).
- [ ] Review CSRF exposure on non-API routes and ensure exempt endpoints are minimal.
- [ ] Validate all secret-loading paths use `config()` or `env()` consistently.
- [ ] Document the production deployment configuration and secret rotation process.

## Optional: Validation checklist
- [ ] Confirm a test covers invalid WebSocket auth rejection.
- [ ] Confirm a test covers invalid GitHub signature rejection.
- [ ] Confirm a test covers content-type rejection for webhook payloads.
- [ ] Confirm auth-registration throttling works under repeated failed attempts.
- [ ] Verify `DEBUG` is false in the deployed environment.
