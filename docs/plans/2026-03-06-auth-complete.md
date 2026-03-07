# Auth System — Complete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add email verification, forgot/reset password, change password, and a settings page to the existing JWT + Google OAuth auth system.

**Architecture:** Stored UUID tokens in a new `auth_tokens` table (single-use, expiry-checked at consume time). SMTP email service with console fallback. Five new backend endpoints, four new frontend pages, one new layout banner.

**Tech Stack:** FastAPI + SQLite (backend), React 18 + TanStack Query + Zod (frontend), Python `smtplib`, slowapi rate limiting.

**Design doc:** `docs/plans/2026-03-06-auth-complete-design.md`

---

### Task 1: DB migrations — email_verified + auth_tokens

**Files:**
- Modify: `openflow/product_db/migrations.py`

**Step 1: Add migrations 003 and 004 to `_MIGRATIONS`**

Open `openflow/product_db/migrations.py`. The list currently ends at index 1 (migration 002). Append two more entries:

```python
_MIGRATIONS = [
    # 001 — session_timeout_minutes on schema configs
    "ALTER TABLE connection_schema_configs ADD COLUMN session_timeout_minutes INTEGER NOT NULL DEFAULT 30",
    # 002 — events_table: let users choose which table contains their events
    "ALTER TABLE connection_schema_configs ADD COLUMN events_table TEXT NOT NULL DEFAULT 'events'",
    # 003 — email verification flag on auth users
    "ALTER TABLE auth_users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0",
    # 004 — token table for email verification and password reset
    """CREATE TABLE IF NOT EXISTS auth_tokens (
        id         TEXT PRIMARY KEY,
        user_id    TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
        token_type TEXT NOT NULL CHECK(token_type IN ('email_verification', 'password_reset')),
        expires_at TEXT NOT NULL,
        used_at    TEXT
    )""",
    "CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id, token_type)",
]
```

**Step 2: Run migrations manually to verify**

```bash
uv run python -c "from openflow.product_db.migrations import run_migrations; run_migrations(); print('OK')"
```

Expected: `OK` with no errors. Run twice — second run should still print `OK` (idempotent).

**Step 3: Commit**

```bash
git add openflow/product_db/migrations.py
git commit -m "feat: db migrations 003+004 — email_verified + auth_tokens"
```

---

### Task 2: Config — SMTP settings

**Files:**
- Modify: `openflow/config.py`
- Modify: `.env.example`

**Step 1: Add SMTP fields to `Settings` class**

In `openflow/config.py`, after the `frontend_url` field (line 43), add:

```python
# SMTP (optional — if not set, emails print to console)
smtp_host: str | None = None
smtp_port: int = 587
smtp_user: str | None = None
smtp_password: str | None = None
smtp_from: str = "OpenFlow <noreply@openflow.app>"
```

**Step 2: Add SMTP vars to `.env.example`**

Append to `.env.example`:

```
# ── Email / SMTP (optional — omit for console fallback in dev) ─────────────────
# OPENFLOW_SMTP_HOST=smtp.gmail.com
# OPENFLOW_SMTP_PORT=587
# OPENFLOW_SMTP_USER=you@gmail.com
# OPENFLOW_SMTP_PASSWORD=your-app-password
# OPENFLOW_SMTP_FROM=OpenFlow <noreply@openflow.app>
```

**Step 3: Verify settings load**

```bash
uv run python -c "from openflow.config import get_settings; s = get_settings(); print(s.smtp_host, s.smtp_port)"
```

Expected: `None 587`

**Step 4: Commit**

```bash
git add openflow/config.py .env.example
git commit -m "feat: add SMTP config fields"
```

---

### Task 3: Email service

**Files:**
- Create: `openflow/services/email_service.py`

**Step 1: Create the file**

```python
"""Email service — SMTP with console fallback for dev."""

import logging
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from openflow.config import get_settings

logger = logging.getLogger(__name__)


def _send_smtp(to: str, subject: str, html: str) -> None:
    settings = get_settings()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, [to], msg.as_string())


def _send(to: str, subject: str, html: str, user_id: str) -> None:
    """Send email — fire-and-forget in background thread."""
    settings = get_settings()

    if not settings.smtp_host:
        # Dev fallback: print to console
        print(f"\n[EMAIL] To: {to}\n[EMAIL] Subject: {subject}\n{html}\n")
        logger.info("email printed to console (no SMTP configured)", extra={"user_id": user_id})
        return

    def _worker():
        try:
            _send_smtp(to, subject, html)
            logger.info("email sent", extra={"user_id": user_id})
        except Exception:
            logger.exception("email send failed", extra={"user_id": user_id})

    threading.Thread(target=_worker, daemon=True).start()


def send_verification_email(to: str, token: str, base_url: str, user_id: str) -> None:
    link = f"{base_url}/auth/verify-email?token={token}"
    html = f"""
    <p>Thanks for signing up for OpenFlow!</p>
    <p>Please verify your email address by clicking the link below:</p>
    <p><a href="{link}">{link}</a></p>
    <p>This link expires in 24 hours.</p>
    """
    _send(to, "Verify your OpenFlow email", html, user_id)


def send_password_reset_email(to: str, token: str, base_url: str, user_id: str) -> None:
    link = f"{base_url}/auth/reset-password?token={token}"
    html = f"""
    <p>You requested a password reset for your OpenFlow account.</p>
    <p>Click the link below to reset your password:</p>
    <p><a href="{link}">{link}</a></p>
    <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    """
    _send(to, "Reset your OpenFlow password", html, user_id)
```

**Step 2: Verify import**

```bash
uv run python -c "from openflow.services.email_service import send_verification_email; print('OK')"
```

Expected: `OK`

**Step 3: Commit**

```bash
git add openflow/services/email_service.py
git commit -m "feat: email service with SMTP + console fallback"
```

---

### Task 4: Auth service — token helpers

**Files:**
- Modify: `openflow/services/auth_service.py`

**Step 1: Add token creation and validation helpers**

At the top of `openflow/services/auth_service.py`, add to imports:

```python
from datetime import timedelta
```

After `_now()`, add these functions:

```python
def _now_plus(hours: int) -> str:
    return (datetime.now(UTC) + timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")


def create_auth_token(user_id: str, token_type: str, expires_hours: int) -> str:
    """Create a single-use token, invalidating any previous unused tokens of the same type."""
    product_db = get_product_db()
    # Invalidate previous unused tokens of the same type for this user
    product_db.execute(
        "DELETE FROM auth_tokens WHERE user_id = ? AND token_type = ? AND used_at IS NULL",
        (user_id, token_type),
    )
    token_id = str(uuid.uuid4())
    product_db.execute(
        "INSERT INTO auth_tokens (id, user_id, token_type, expires_at) VALUES (?, ?, ?, ?)",
        (token_id, user_id, token_type, _now_plus(expires_hours)),
    )
    return token_id


def consume_auth_token(token_id: str, token_type: str):
    """Validate and consume a token. Returns user_id or None if invalid."""
    product_db = get_product_db()
    row = product_db.fetchone(
        "SELECT * FROM auth_tokens WHERE id = ? AND token_type = ?",
        (token_id, token_type),
    )
    if not row:
        return None
    if row["used_at"] is not None:
        return None
    # Check expiry
    expires_at = datetime.strptime(row["expires_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)
    if datetime.now(UTC) > expires_at:
        return None
    # Mark used
    product_db.execute(
        "UPDATE auth_tokens SET used_at = ? WHERE id = ?",
        (_now(), token_id),
    )
    return row["user_id"]
```

**Step 2: Update `register_user` to send verification email**

At the end of `register_user`, before `return`, add:

```python
    # Send verification email (fire-and-forget)
    from openflow.services.email_service import send_verification_email
    settings = get_settings()
    token = create_auth_token(user_id, "email_verification", 24)
    base_url = settings.frontend_url or "http://localhost:5173"
    send_verification_email(email, token, base_url, user_id)
```

Also add the import at the top: `from openflow.config import get_settings`

**Step 3: Update `upsert_google_user` to set email_verified=1**

In the "Create new user" block of `upsert_google_user`, change the INSERT to include `email_verified`:

```python
    product_db.execute(
        "INSERT INTO auth_users (id, email, display_name, google_id, avatar_url, email_verified, created_at, last_login_at) "
        "VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
        (user_id, email, display_name, google_id, avatar_url, now, now),
    )
```

Also update the "Find by email (link google_id)" block to set `email_verified = 1` when linking Google:

```python
        product_db.execute(
            "UPDATE auth_users SET google_id = ?, avatar_url = ?, email_verified = 1, last_login_at = ? WHERE id = ?",
            (google_id, avatar_url, now, row["id"]),
        )
```

**Step 4: Verify**

```bash
uv run python -c "from openflow.services.auth_service import create_auth_token, consume_auth_token; print('OK')"
```

Expected: `OK`

**Step 5: Commit**

```bash
git add openflow/services/auth_service.py
git commit -m "feat: auth service token helpers + email_verified on Google upsert"
```

---

### Task 5: Backend — new auth endpoints

**Files:**
- Modify: `openflow/api/auth.py`

**Step 1: Update imports and models**

Add to the imports block at the top:

```python
from openflow.services.auth_service import (
    authenticate_user,
    register_user,
    upsert_google_user,
    create_auth_token,
    consume_auth_token,
)
from openflow.services.email_service import send_verification_email, send_password_reset_email
from openflow.core.password import hash_password, verify_password
from openflow.product_db import get_product_db
```

Add new request/response models after the existing ones:

```python
class ForgotPasswordBody(BaseModel):
    email: str


class ResetPasswordBody(BaseModel):
    token: str
    new_password: str


class ChangePasswordBody(BaseModel):
    current_password: str | None = None
    new_password: str
```

**Step 2: Update `AuthUserResponse` to include `email_verified`**

Change the `AuthUserResponse` model:

```python
class AuthUserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    email_verified: bool = False
    created_at: str
    last_login_at: str | None = None
```

Update `_row_to_response`:

```python
def _row_to_response(row) -> AuthUserResponse:
    return AuthUserResponse(
        id=row["id"],
        email=row["email"],
        display_name=row["display_name"],
        avatar_url=row["avatar_url"],
        email_verified=bool(row["email_verified"]) if row["email_verified"] is not None else False,
        created_at=row["created_at"],
        last_login_at=row["last_login_at"],
    )
```

**Step 3: Add the five new endpoints**

Add these after the existing `me` endpoint:

```python
@router.post("/forgot-password")
@limiter.limit("3/hour")
def forgot_password(request: Request, body: ForgotPasswordBody):
    email = body.email.lower().strip()
    product_db = get_product_db()
    row = product_db.fetchone("SELECT * FROM auth_users WHERE email = ?", (email,))
    if row:
        token = create_auth_token(row["id"], "password_reset", 1)
        base_url = settings.frontend_url or "http://localhost:5173"
        send_password_reset_email(email, token, base_url, row["id"])
    # Always return 200 to prevent user enumeration
    return {"ok": True}


@router.post("/reset-password")
@limiter.limit("5/hour")
def reset_password(request: Request, body: ResetPasswordBody):
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    user_id = consume_auth_token(body.token, "password_reset")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    product_db = get_product_db()
    product_db.execute(
        "UPDATE auth_users SET password_hash = ? WHERE id = ?",
        (hash_password(body.new_password), user_id),
    )
    return {"ok": True}


@router.post("/resend-verification")
@limiter.limit("3/hour")
def resend_verification(
    request: Request,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    product_db = get_product_db()
    row = product_db.fetchone("SELECT * FROM auth_users WHERE id = ?", (current_user.id,))
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row["email_verified"]:
        return {"ok": True}
    token = create_auth_token(current_user.id, "email_verification", 24)
    base_url = settings.frontend_url or "http://localhost:5173"
    send_verification_email(row["email"], token, base_url, current_user.id)
    return {"ok": True}


@router.get("/verify-email")
def verify_email(token: str):
    user_id = consume_auth_token(token, "email_verification")
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    product_db = get_product_db()
    product_db.execute(
        "UPDATE auth_users SET email_verified = 1 WHERE id = ?", (user_id,)
    )
    return {"ok": True}


@router.post("/change-password")
def change_password(
    body: ChangePasswordBody,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if len(body.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    product_db = get_product_db()
    row = product_db.fetchone("SELECT * FROM auth_users WHERE id = ?", (current_user.id,))
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    # If user has a password, verify current_password
    if row["password_hash"]:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password is required")
        if not verify_password(body.current_password, row["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    product_db.execute(
        "UPDATE auth_users SET password_hash = ? WHERE id = ?",
        (hash_password(body.new_password), current_user.id),
    )
    return {"ok": True}
```

**Step 4: Start the server and smoke-test**

```bash
uv run serve
```

In a separate terminal:

```bash
curl -s -X POST http://localhost:8000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@example.com"}' | python -m json.tool
```

Expected: `{"ok": true}`

**Step 5: Commit**

```bash
git add openflow/api/auth.py
git commit -m "feat: add forgot-password, reset-password, verify-email, resend-verification, change-password endpoints"
```

---

### Task 6: Frontend — update AuthUser type + API queries

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/api/queries.ts`
- Modify: `src/lib/schemas/auth-schemas.ts`

**Step 1: Add `email_verified` to `AuthUser` type**

In `src/types/index.ts`, update the `AuthUser` interface:

```typescript
export interface AuthUser {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  email_verified: boolean
  created_at: string
  last_login_at: string | null
}
```

**Step 2: Add new API query functions**

In `src/lib/api/queries.ts`, add after the existing auth functions:

```typescript
export async function forgotPassword(email: string): Promise<{ ok: boolean }> {
  return fetchApi('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, new_password: string): Promise<{ ok: boolean }> {
  return fetchApi('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password }),
  })
}

export async function verifyEmail(token: string): Promise<{ ok: boolean }> {
  return fetchApi(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
}

export async function resendVerification(): Promise<{ ok: boolean }> {
  return fetchApi('/api/auth/resend-verification', { method: 'POST' })
}

export async function changePassword(
  current_password: string | null,
  new_password: string
): Promise<{ ok: boolean }> {
  return fetchApi('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  })
}
```

**Step 3: Add new Zod schemas**

In `src/lib/schemas/auth-schemas.ts`, append:

```typescript
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const ResetPasswordSchema = z
  .object({
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const ChangePasswordSchema = z
  .object({
    current_password: z.string().optional(),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
```

**Step 4: Verify TypeScript**

```bash
npm run build 2>&1 | head -30
```

Expected: no type errors (build may fail on missing pages — that's fine, we just want to check for type errors in the files we just changed).

**Step 5: Commit**

```bash
git add src/types/index.ts src/lib/api/queries.ts src/lib/schemas/auth-schemas.ts
git commit -m "feat: add email_verified to AuthUser type + new auth API query functions"
```

---

### Task 7: Frontend — ForgotPasswordPage

**Files:**
- Create: `src/features/auth/ForgotPasswordPage.tsx`

**Step 1: Create the page**

```tsx
import { useState } from 'react'
import { AuthCard } from './components/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ForgotPasswordSchema } from '@/lib/schemas/auth-schemas'
import { forgotPassword } from '@/lib/api/queries'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = ForgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.errors[0].message)
      return
    }
    setError('')
    setIsPending(true)
    try {
      await forgotPassword(email)
      setSubmitted(true)
    } catch {
      // Still show success to prevent user enumeration
      setSubmitted(true)
    } finally {
      setIsPending(false)
    }
  }

  if (submitted) {
    return (
      <AuthCard title="Check your inbox" subtitle="If an account with that email exists, we sent a reset link. It expires in 1 hour.">
        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthCard>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/ForgotPasswordPage.tsx
git commit -m "feat: ForgotPasswordPage"
```

---

### Task 8: Frontend — ResetPasswordPage

**Files:**
- Create: `src/features/auth/ResetPasswordPage.tsx`

**Step 1: Create the page**

```tsx
import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AuthCard } from './components/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResetPasswordSchema } from '@/lib/schemas/auth-schemas'
import { resetPassword } from '@/lib/api/queries'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <AuthCard title="Invalid link" subtitle="This password reset link is missing or malformed." />
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = ResetPasswordSchema.safeParse({ new_password: newPassword, confirm_password: confirmPassword })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setApiError('')
    setIsPending(true)
    try {
      await resetPassword(token, newPassword)
      setDone(true)
      setTimeout(() => navigate('/auth/login'), 2000)
    } catch (err) {
      setApiError((err as Error).message)
    } finally {
      setIsPending(false)
    }
  }

  if (done) {
    return (
      <AuthCard title="Password reset!" subtitle="Your password has been updated. Redirecting to login…" />
    )
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter a new password for your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          {errors.new_password && <p className="text-xs text-destructive">{errors.new_password}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          {errors.confirm_password && <p className="text-xs text-destructive">{errors.confirm_password}</p>}
        </div>
        {apiError && <p className="text-sm text-destructive">{apiError}</p>}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </AuthCard>
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/ResetPasswordPage.tsx
git commit -m "feat: ResetPasswordPage"
```

---

### Task 9: Frontend — VerifyEmailPage

**Files:**
- Create: `src/features/auth/VerifyEmailPage.tsx`

**Step 1: Create the page**

```tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthCard } from './components/AuthCard'
import { verifyEmail } from '@/lib/api/queries'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No token provided.')
      return
    }
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err: Error) => {
        setStatus('error')
        setErrorMsg(err.message)
      })
  }, [token])

  if (status === 'pending') {
    return <AuthCard title="Verifying…" subtitle="Please wait while we verify your email." />
  }

  if (status === 'success') {
    return (
      <AuthCard title="Email verified!" subtitle="Your email address has been confirmed. You can close this tab or go to your dashboard." />
    )
  }

  return (
    <AuthCard title="Verification failed" subtitle={errorMsg || 'This link may have expired or already been used.'} />
  )
}
```

**Step 2: Commit**

```bash
git add src/features/auth/VerifyEmailPage.tsx
git commit -m "feat: VerifyEmailPage"
```

---

### Task 10: Frontend — wire up new routes + update auth index

**Files:**
- Modify: `src/features/auth/index.ts`
- Modify: `src/App.tsx`

**Step 1: Export new pages from auth index**

In `src/features/auth/index.ts`, append:

```typescript
export { ForgotPasswordPage } from './ForgotPasswordPage'
export { ResetPasswordPage } from './ResetPasswordPage'
export { VerifyEmailPage } from './VerifyEmailPage'
```

**Step 2: Add lazy imports and routes in `src/App.tsx`**

After the existing `RegisterPage` lazy import, add:

```typescript
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth').then((m) => ({ default: m.ForgotPasswordPage }))
)
const ResetPasswordPage = lazy(() =>
  import('@/features/auth').then((m) => ({ default: m.ResetPasswordPage }))
)
const VerifyEmailPage = lazy(() =>
  import('@/features/auth').then((m) => ({ default: m.VerifyEmailPage }))
)
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
```

In the `<Routes>` block, in the Public section, add:

```tsx
<Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/auth/reset-password" element={<ResetPasswordPage />} />
<Route path="/auth/verify-email" element={<VerifyEmailPage />} />
```

In the Protected section (inside `DashboardLayout`), add:

```tsx
<Route path="/settings" element={<SettingsPage />} />
```

**Step 3: Add "Forgot password?" link to LoginForm**

In `src/features/auth/components/LoginForm.tsx`, after the password input block, add:

```tsx
<div className="flex justify-end">
  <Link to="/auth/forgot-password" className="text-xs text-muted-foreground hover:underline">
    Forgot your password?
  </Link>
</div>
```

**Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors (SettingsPage doesn't exist yet — ignore that one missing file error for now).

**Step 5: Commit**

```bash
git add src/features/auth/index.ts src/App.tsx src/features/auth/components/LoginForm.tsx
git commit -m "feat: wire up forgot/reset/verify-email routes + forgot password link in login form"
```

---

### Task 11: Frontend — EmailVerificationBanner

**Files:**
- Create: `src/components/layout/EmailVerificationBanner.tsx`
- Modify: `src/components/layout/DashboardLayout.tsx`

**Step 1: Create the banner component**

```tsx
import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resendVerification } from '@/lib/api/queries'
import { useAuthContext } from '@/contexts/AuthContext'

export function EmailVerificationBanner() {
  const { user } = useAuthContext()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Only show for email users (no google_id-equivalent — check email_verified)
  if (!user || user.email_verified || dismissed) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await resendVerification()
      setSent(true)
    } catch {
      // Silently ignore — user can try again
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
      <span>
        Please verify your email address.{' '}
        {sent ? (
          <span className="font-medium">Verification email sent!</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="font-medium underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Resend email'}
          </button>
        )}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-amber-600 hover:text-amber-900"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
```

**Step 2: Add banner to DashboardLayout**

In `src/components/layout/DashboardLayout.tsx`, import and render the banner:

```tsx
import { Outlet } from 'react-router-dom'
import { useAppStore } from '@/stores'
import { useUrlSync } from '@/hooks'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { EmailVerificationBanner } from './EmailVerificationBanner'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  useUrlSync()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex-1 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'lg:ml-[220px]' : 'lg:ml-[60px]'
        )}
      >
        <EmailVerificationBanner />
        <Header />
        <main className="p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/layout/EmailVerificationBanner.tsx src/components/layout/DashboardLayout.tsx
git commit -m "feat: EmailVerificationBanner in DashboardLayout"
```

---

### Task 12: Frontend — SettingsPage with change password card

**Files:**
- Create: `src/pages/SettingsPage.tsx`
- Modify: `src/components/layout/Sidebar.tsx` (add Settings nav item)

**Step 1: Create SettingsPage**

```tsx
import { useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordSchema } from '@/lib/schemas/auth-schemas'
import { changePassword } from '@/lib/api/queries'
import { SPACING } from '@/lib/constants'

export function SettingsPage() {
  const { user } = useAuthContext()
  const hasPassword = Boolean(user) // we can't know from client if password_hash is set, so always show current field; backend will reject if not needed
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = ChangePasswordSchema.safeParse({
      current_password: currentPassword || undefined,
      new_password: newPassword,
      confirm_password: confirmPassword,
    })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    setApiError('')
    setIsPending(true)
    try {
      await changePassword(currentPassword || null, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setApiError((err as Error).message)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={SPACING.page}>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Settings</h1>

      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              {hasPassword
                ? 'Update your account password.'
                : 'Set a password to enable email login.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                {errors.current_password && (
                  <p className="text-xs text-destructive">{errors.current_password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {errors.new_password && (
                  <p className="text-xs text-destructive">{errors.new_password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {errors.confirm_password && (
                  <p className="text-xs text-destructive">{errors.confirm_password}</p>
                )}
              </div>
              {apiError && <p className="text-sm text-destructive">{apiError}</p>}
              {success && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Password updated successfully.
                </p>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Step 2: Add Settings link to Sidebar**

Open `src/components/layout/Sidebar.tsx`. Find the nav items array. Add a Settings entry (with `Settings` icon from lucide-react) near the bottom, before any logout/auth items. The exact location depends on the current sidebar structure — place it logically as the last nav item before any user/account section.

Example pattern (adapt to match existing style):

```tsx
{ to: '/settings', icon: Settings, label: 'Settings' },
```

Import `Settings` from `lucide-react` at the top if not already imported.

**Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "^src.*error" | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/pages/SettingsPage.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: SettingsPage with change password card + Settings nav item"
```

---

### Task 13: End-to-end smoke test

**Step 1: Start servers**

```bash
# Terminal 1
uv run serve

# Terminal 2
npm run dev
```

**Step 2: Test email verification flow**

1. Register a new account at `http://localhost:5173/auth/register`
2. Check server terminal for the email printed to console — copy the verify link
3. Open the verify link in the browser
4. Expected: "Email verified!" page
5. Log in with the new account — banner should NOT appear

**Step 3: Test forgot password flow**

1. Go to `http://localhost:5173/auth/forgot-password`
2. Enter the registered email
3. Check server terminal for the reset link — copy it
4. Open the reset link, enter a new password
5. Expected: "Password reset!" then redirect to login
6. Log in with the new password — should work

**Step 4: Test change password**

1. Log in, go to `http://localhost:5173/settings`
2. Enter current password + new password
3. Expected: "Password updated successfully."
4. Log out, log in with new password — should work

**Step 5: Test unverified banner**

1. Register a new account but do NOT click the verify link
2. Log in
3. Expected: amber banner "Please verify your email address. Resend email"
4. Click "Resend email" — should show "Verification email sent!"
5. Click X to dismiss

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: auth complete system — email verification, forgot/reset password, change password, settings"
```

---

## Fly.io deployment notes

After deploying, set secrets:

```bash
fly secrets set \
  OPENFLOW_SMTP_HOST=smtp.gmail.com \
  OPENFLOW_SMTP_PORT=587 \
  OPENFLOW_SMTP_USER=your@gmail.com \
  OPENFLOW_SMTP_PASSWORD=your-app-password \
  OPENFLOW_SMTP_FROM="OpenFlow <noreply@yourdomain.com>"
```

The `OPENFLOW_FRONTEND_URL` secret must already be set to the production URL (used in email links).
