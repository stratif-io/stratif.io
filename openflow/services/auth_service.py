"""Authentication business logic."""

import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from openflow.config import get_settings
from openflow.core.password import hash_password, verify_password
from openflow.product_db import get_product_db


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


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
    expires_at = datetime.strptime(row["expires_at"], "%Y-%m-%dT%H:%M:%SZ").replace(
        tzinfo=UTC
    )
    if datetime.now(UTC) > expires_at:
        return None
    # Mark used
    product_db.execute(
        "UPDATE auth_tokens SET used_at = ? WHERE id = ?",
        (_now(), token_id),
    )
    return row["user_id"]


def _create_users_row(user_id: str) -> None:
    """Create a corresponding row in the legacy users table (satisfies FK for connections)."""
    product_db = get_product_db()
    existing = product_db.fetchone("SELECT id FROM users WHERE id = ?", (user_id,))
    if not existing:
        # Use a hash of the UUID as api_key_hash to satisfy NOT NULL constraint
        api_key_hash = hashlib.sha256(user_id.encode()).hexdigest()
        product_db.execute(
            "INSERT INTO users (id, api_key_hash) VALUES (?, ?)",
            (user_id, api_key_hash),
        )


def register_user(email: str, password: str, display_name: str):
    """Register a new email/password user. Returns the auth_users row."""
    product_db = get_product_db()
    email = email.lower().strip()

    # Check uniqueness
    existing = product_db.fetchone(
        "SELECT id FROM auth_users WHERE email = ?", (email,)
    )
    if existing:
        return None  # caller should treat as conflict

    user_id = str(uuid.uuid4())
    pw_hash = hash_password(password)
    now = _now()

    product_db.execute(
        "INSERT INTO auth_users (id, email, display_name, password_hash, created_at, last_login_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, email, display_name, pw_hash, now, now),
    )
    _create_users_row(user_id)

    # Send verification email (fire-and-forget)
    from openflow.services.email_service import send_verification_email

    settings = get_settings()
    token = create_auth_token(user_id, "email_verification", 24)
    base_url = settings.frontend_url or "http://localhost:5173"
    send_verification_email(email, token, base_url, user_id)

    return product_db.fetchone("SELECT * FROM auth_users WHERE id = ?", (user_id,))


def authenticate_user(email: str, password: str):
    """Verify credentials. Returns the auth_users row or None."""
    product_db = get_product_db()
    email = email.lower().strip()

    row = product_db.fetchone("SELECT * FROM auth_users WHERE email = ?", (email,))
    if not row:
        return None
    if not row["password_hash"]:
        return None  # Google-only account
    if not verify_password(password, row["password_hash"]):
        return None

    # Update last_login_at
    product_db.execute(
        "UPDATE auth_users SET last_login_at = ? WHERE id = ?",
        (_now(), row["id"]),
    )
    return product_db.fetchone("SELECT * FROM auth_users WHERE id = ?", (row["id"],))


def upsert_google_user(
    google_id: str,
    email: str,
    display_name: str | None,
    avatar_url: str | None,
):
    """Find or create a user for Google OAuth. Returns the auth_users row."""
    product_db = get_product_db()
    email = email.lower().strip()
    now = _now()

    # Find by google_id
    row = product_db.fetchone(
        "SELECT * FROM auth_users WHERE google_id = ?", (google_id,)
    )
    if row:
        product_db.execute(
            "UPDATE auth_users SET last_login_at = ? WHERE id = ?",
            (now, row["id"]),
        )
        return product_db.fetchone(
            "SELECT * FROM auth_users WHERE id = ?", (row["id"],)
        )

    # Find by email (link google_id)
    row = product_db.fetchone("SELECT * FROM auth_users WHERE email = ?", (email,))
    if row:
        product_db.execute(
            "UPDATE auth_users SET google_id = ?, avatar_url = ?, email_verified = 1, last_login_at = ? WHERE id = ?",
            (google_id, avatar_url, now, row["id"]),
        )
        return product_db.fetchone(
            "SELECT * FROM auth_users WHERE id = ?", (row["id"],)
        )

    # Create new user
    user_id = str(uuid.uuid4())
    product_db.execute(
        "INSERT INTO auth_users (id, email, display_name, google_id, avatar_url, email_verified, created_at, last_login_at) "
        "VALUES (?, ?, ?, ?, ?, 1, ?, ?)",
        (user_id, email, display_name, google_id, avatar_url, now, now),
    )
    _create_users_row(user_id)

    return product_db.fetchone("SELECT * FROM auth_users WHERE id = ?", (user_id,))
