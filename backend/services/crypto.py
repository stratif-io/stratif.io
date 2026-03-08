"""Credential encryption/decryption using Fernet symmetric encryption."""

import base64
import hashlib
import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from openflow.config import get_settings


def _get_fernet() -> Fernet:
    """Derive a valid 32-byte Fernet key from the configured encryption_key."""
    settings = get_settings()
    raw = settings.encryption_key.encode()
    # Derive a 32-byte key via SHA-256 then base64url-encode it (Fernet requirement)
    key_bytes = hashlib.sha256(raw).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_credentials(credentials: dict[str, Any]) -> str:
    """Encrypt a credentials dict to a base64 token string."""
    plaintext = json.dumps(credentials).encode()
    return _get_fernet().encrypt(plaintext).decode()


def decrypt_credentials(token: str) -> dict[str, Any]:
    """Decrypt a credentials token back to a dict. Raises ValueError on failure."""
    try:
        plaintext = _get_fernet().decrypt(token.encode())
        return json.loads(plaintext)
    except (InvalidToken, json.JSONDecodeError) as exc:
        raise ValueError("Failed to decrypt credentials") from exc
