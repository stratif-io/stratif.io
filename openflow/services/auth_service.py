"""Authentication business logic."""

import hashlib
import uuid
from datetime import UTC, datetime

from openflow.core.password import hash_password, verify_password
from openflow.product_db import get_product_db


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


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
            "UPDATE auth_users SET google_id = ?, avatar_url = ?, last_login_at = ? WHERE id = ?",
            (google_id, avatar_url, now, row["id"]),
        )
        return product_db.fetchone(
            "SELECT * FROM auth_users WHERE id = ?", (row["id"],)
        )

    # Create new user
    user_id = str(uuid.uuid4())
    product_db.execute(
        "INSERT INTO auth_users (id, email, display_name, google_id, avatar_url, created_at, last_login_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, email, display_name, google_id, avatar_url, now, now),
    )
    _create_users_row(user_id)

    return product_db.fetchone("SELECT * FROM auth_users WHERE id = ?", (user_id,))
