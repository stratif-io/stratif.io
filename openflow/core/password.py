"""Password hashing utilities."""

import base64
import hashlib

import bcrypt

_ROUNDS = 12


def _prehash(plain: str) -> bytes:
    """SHA-256 pre-hash so bcrypt always receives exactly 44 bytes.

    bcrypt truncates (or errors on) inputs longer than 72 bytes; running the
    password through SHA-256 first collapses any length down to a 44-byte
    base64 string while preserving the full password entropy.
    """
    digest = hashlib.sha256(plain.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt (SHA-256 pre-hashed)."""
    hashed = bcrypt.hashpw(_prehash(plain), bcrypt.gensalt(rounds=_ROUNDS))
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(_prehash(plain), hashed.encode("utf-8"))
