# Auth System — Complete Design

**Date:** 2026-03-06
**Status:** Approved

## Goal

Extend the existing JWT + Google OAuth auth system with:
- Email verification (activation) after signup
- Forgot password / reset password flow
- Change password (for email users and Google-only users setting a password)
- Email verification banner in the dashboard
- Minimal settings page

## Constraints

- Email transport: SMTP (configurable via env vars, optional in dev)
- Unverified users: can log in, but see a persistent banner prompting verification
- Google OAuth users: automatically marked `email_verified = true`
- Token strategy: stored UUID tokens (single-use, DB-invalidated)
- Reset token expiry: 1 hour
- Verification token expiry: 24 hours

---

## Database Changes

Two migrations added to `openflow/product_db/migrations.py`:

```sql
-- Migration 003
ALTER TABLE auth_users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

-- Migration 004
CREATE TABLE IF NOT EXISTS auth_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    token_type TEXT NOT NULL CHECK(token_type IN ('email_verification', 'password_reset')),
    expires_at TEXT NOT NULL,
    used_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, token_type);
```

Google OAuth upsert sets `email_verified = 1` at creation time.

---

## Email Service

**File:** `openflow/services/email_service.py`

SMTP wrapper using Python's `smtplib`. Config:

```
OPENFLOW_SMTP_HOST      smtp host (e.g. smtp.gmail.com)
OPENFLOW_SMTP_PORT      default 587 (STARTTLS)
OPENFLOW_SMTP_USER      login username
OPENFLOW_SMTP_PASSWORD  login password / app password
OPENFLOW_SMTP_FROM      display name + address (e.g. "OpenFlow <noreply@example.com>")
```

Behavior:
- If SMTP is not configured → emails are printed to console (dev mode)
- Sending is fire-and-forget in a background thread (never blocks API)
- Logs `INFO` with user_id on send; never logs the token

Two templates (plain HTML strings in the service):
- `send_verification_email(to, token, base_url)` → link to `{base_url}/auth/verify-email?token={token}`
- `send_password_reset_email(to, token, base_url)` → link to `{base_url}/auth/reset-password?token={token}`

---

## Backend API

All endpoints in `openflow/api/auth.py`. New endpoints:

### POST `/api/auth/forgot-password`
- Body: `{ email: str }`
- Always returns `200 { "ok": true }` (no user enumeration)
- If user exists: creates `password_reset` token (1hr expiry), invalidates previous unused reset tokens, sends email
- Rate limit: `3/hour`

### POST `/api/auth/reset-password`
- Body: `{ token: str, new_password: str }`
- Validates token (exists, not used, not expired, type=`password_reset`)
- Updates `password_hash`, marks token `used_at`
- Returns `200` or `400` with reason
- Rate limit: `5/hour`

### POST `/api/auth/resend-verification`
- Requires auth (JWT cookie)
- No body
- Invalidates previous unused verification tokens, creates new one (24hr), sends email
- Returns `200 { "ok": true }`
- Rate limit: `3/hour`

### GET `/api/auth/verify-email?token=xxx`
- Validates token (exists, not used, not expired, type=`email_verification`)
- Sets `auth_users.email_verified = 1`, marks token `used_at`
- Returns `200 { "ok": true }` or `400` with reason

### POST `/api/auth/change-password`
- Requires auth
- Body: `{ current_password: str | null, new_password: str }`
- If `password_hash IS NULL` (Google-only user): `current_password` not required
- Else: verifies `current_password` first
- Returns `200` or `400`

### Updated: GET `/api/auth/me`
- Add `email_verified: bool` to response

### Updated: POST `/api/auth/register`
- After creating user: create `email_verification` token, send verification email

### Updated: POST `/api/auth/google/callback` (upsert)
- Set `email_verified = 1` for Google users

---

## Config Changes

Add to `openflow/config.py`:

```python
smtp_host: str | None = None
smtp_port: int = 587
smtp_user: str | None = None
smtp_password: str | None = None
smtp_from: str = "OpenFlow <noreply@openflow.app>"
```

---

## Frontend

### New routes / pages

| Route | File | Description |
|-------|------|-------------|
| `/auth/forgot-password` | `ForgotPasswordPage.tsx` | Email input → success state |
| `/auth/reset-password` | `ResetPasswordPage.tsx` | `?token=` → new password form |
| `/auth/verify-email` | `VerifyEmailPage.tsx` | `?token=` → calls API → success/error |
| `/settings` | `SettingsPage.tsx` | Change password card |

### New component: EmailVerificationBanner

- Rendered in `DashboardLayout` when `user.email_verified === false` AND user has no `google_id`
- Shows: "Please verify your email address. [Resend email]"
- Resend button calls `POST /api/auth/resend-verification`, shows toast on success
- Dismissible per session (state in component, not persisted)

### Auth context update

- `AuthContext` / `useAuthContext` — add `email_verified: boolean` to user type
- `AuthUserResponse` Zod schema updated to include `email_verified`

---

## Security

| Concern | Mitigation |
|---------|-----------|
| User enumeration via forgot-password | Always return 200 |
| Token reuse | `used_at` set on consume; reused token returns 400 |
| Concurrent reset requests | Previous unused tokens invalidated on new request |
| Weak passwords | Minimum 8 chars enforced on backend |
| Google users without password | `change-password` detects `password_hash IS NULL`, skips current_password check |
| Token value in logs | Never logged; only user_id is logged |
| HTTPS links in emails | Links use `OPENFLOW_API_URL` (production env var) |

---

## Out of Scope

- Magic link login
- 2FA / TOTP
- Account deletion
- Admin user management UI
- Email template styling (plain functional HTML only)
