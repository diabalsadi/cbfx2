import os
from functools import lru_cache
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = os.environ["FIELD_ENCRYPTION_KEY"]
    return Fernet(key.encode())


def encrypt_field(value: Optional[str]) -> Optional[str]:
    """Encrypts a plaintext value for at-rest storage (e.g. investor_password_encrypted).
    Returns None unchanged so callers can pass through optional fields freely."""
    if value is None:
        return None
    return _fernet().encrypt(value.encode()).decode()


def decrypt_field(token: Optional[str]) -> Optional[str]:
    if token is None:
        return None
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return None
