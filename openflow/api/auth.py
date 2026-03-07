"""Authentication API — register, login, logout, OAuth."""

import secrets
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from pydantic import BaseModel

from openflow.config import Settings, get_settings
from openflow.core.jwt_auth import AuthUserRow, get_current_auth_user
from openflow.core.jwt_utils import create_access_token
from openflow.core.password import hash_password, verify_password
from openflow.core.rate_limit import limiter
from openflow.product_db import get_product_db
from openflow.services.auth_service import (
    authenticate_user,
    consume_auth_token,
    create_auth_token,
    register_user,
    upsert_google_user,
)
from openflow.services.email_service import (
    send_password_reset_email,
    send_verification_email,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

settings: Settings = get_settings()

_OAUTH_STATE_COOKIE = "of_oauth_state"
_SESSION_COOKIE = "of_session"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _set_session_cookie(response: Response, user_id: str, email: str) -> None:
    token = create_access_token(user_id, email)
    response.set_cookie(
        _SESSION_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=settings.jwt_expire_days * 86400,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(_SESSION_COOKIE, path="/")


def _make_state_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(settings.jwt_secret, salt="oauth-state")


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class RegisterBody(BaseModel):
    email: str
    password: str
    display_name: str


class LoginBody(BaseModel):
    email: str
    password: str


class ForgotPasswordBody(BaseModel):
    email: str


class ResetPasswordBody(BaseModel):
    token: str
    new_password: str


class ChangePasswordBody(BaseModel):
    current_password: str | None = None
    new_password: str


class AuthUserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    email_verified: bool = False
    created_at: str
    last_login_at: str | None = None


def _row_to_response(row) -> AuthUserResponse:
    return AuthUserResponse(
        id=row["id"],
        email=row["email"],
        display_name=row["display_name"],
        avatar_url=row["avatar_url"],
        email_verified=bool(row["email_verified"])
        if row["email_verified"] is not None
        else False,
        created_at=row["created_at"],
        last_login_at=row["last_login_at"],
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/register", response_model=AuthUserResponse, status_code=status.HTTP_201_CREATED
)
@limiter.limit("3/minute")
def register(request: Request, body: RegisterBody, response: Response):
    if not settings.allow_registration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled",
        )
    row = register_user(
        email=body.email,
        password=body.password,
        display_name=body.display_name,
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    _set_session_cookie(response, row["id"], row["email"])
    return _row_to_response(row)


@router.post("/login", response_model=AuthUserResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginBody, response: Response):
    row = authenticate_user(email=body.email, password=body.password)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    _set_session_cookie(response, row["id"], row["email"])
    return _row_to_response(row)


@router.post("/logout")
def logout(response: Response):
    _clear_session_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=AuthUserResponse)
def me(
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if current_user:
        row = get_product_db().fetchone(
            "SELECT * FROM auth_users WHERE id = ?", (current_user.id,)
        )
        return _row_to_response(row)
    else:
        raise ValueError("current_user cannot be None")


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
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )
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
    row = product_db.fetchone(
        "SELECT * FROM auth_users WHERE id = ?", (current_user.id,)
    )
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
        raise HTTPException(
            status_code=400, detail="Invalid or expired verification token"
        )
    product_db = get_product_db()
    product_db.execute(
        "UPDATE auth_users SET email_verified = 1 WHERE id = ?", (user_id,)
    )
    return {"ok": True}


@router.post("/change-password")
@limiter.limit("5/hour")
def change_password(
    request: Request,
    body: ChangePasswordBody,
    current_user: Annotated[AuthUserRow | None, Depends(get_current_auth_user)] = None,
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )
    product_db = get_product_db()
    row = product_db.fetchone(
        "SELECT * FROM auth_users WHERE id = ?", (current_user.id,)
    )
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


@router.get("/google")
def google_auth(response: Response):
    """Return the Google OAuth consent URL and set an CSRF-protected state cookie."""
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    state_token = secrets.token_urlsafe(32)
    serializer = _make_state_serializer()
    signed_state = serializer.dumps(state_token)

    response.set_cookie(
        _OAUTH_STATE_COOKIE,
        signed_state,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=600,
        path="/",
    )

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state_token,
        "access_type": "offline",
        "prompt": "select_account",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    redirect_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    return {"redirect_url": redirect_url}


@router.get("/google/callback")
def google_callback(request: Request, response: Response, code: str, state: str):
    """Exchange the authorization code for tokens, upsert user, set session."""
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    # Verify CSRF state
    signed_state = request.cookies.get(_OAUTH_STATE_COOKIE)
    response.delete_cookie(_OAUTH_STATE_COOKIE, path="/")

    if not signed_state:
        raise HTTPException(status_code=400, detail="Missing OAuth state cookie")

    serializer = _make_state_serializer()
    try:
        expected_state = serializer.loads(signed_state, max_age=600)
    except SignatureExpired as err:
        raise HTTPException(status_code=400, detail="OAuth state expired") from err
    except BadSignature as err:
        raise HTTPException(status_code=400, detail="Invalid OAuth state") from err

    if expected_state != state:
        raise HTTPException(status_code=400, detail="OAuth state mismatch")

    # Exchange code for tokens
    with httpx.Client() as client:
        token_resp = client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange OAuth code")

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token in OAuth response")

    # Fetch user info
    with httpx.Client() as client:
        userinfo_resp = client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch Google user info")

    userinfo = userinfo_resp.json()
    google_id = userinfo.get("id")
    email = userinfo.get("email")
    if not google_id or not email:
        raise HTTPException(status_code=400, detail="Incomplete user info from Google")

    row = upsert_google_user(
        google_id=google_id,
        email=email,
        display_name=userinfo.get("name"),
        avatar_url=userinfo.get("picture"),
    )
    if row:
        _set_session_cookie(response, row["id"], row["email"])
        from fastapi.responses import RedirectResponse

        return RedirectResponse(
            url=f"{settings.frontend_url}/dashboard", status_code=302
        )
