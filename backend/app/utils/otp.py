import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

OTP_TTL_MINUTES = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

# Reuses JWT_SECRET as a pepper so the stored hash can't be reversed even if
# the pending_registrations table leaks — OTPs are only 6 digits, so hashing
# without a secret would be brute-forceable offline in an instant. Safe to
# assume this is always set: app.utils.auth imports before this module
# anywhere it matters and already hard-fails at import time if it's missing.
_PEPPER = os.getenv("JWT_SECRET", "")


def _peppered_hash(value: str) -> str:
    return hashlib.sha256(f"{value}{_PEPPER}".encode("utf-8")).hexdigest()


def generate_otp() -> str:
    """Cryptographically random 6-digit code, zero-padded."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(code: str) -> str:
    return _peppered_hash(code)


def generate_registration_token() -> str:
    """Opaque per-registration-attempt secret, returned only in the direct
    HTTPS response to /auth/register (never emailed). Possessing it is what
    proves a caller to /auth/verify-otp — or a caller replacing an
    in-progress /auth/register — is the same party that started this signup,
    not just someone who knows the target email address."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return _peppered_hash(token)


def secure_compare(a: str, b: str) -> bool:
    return hmac.compare_digest(a, b)


def otp_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ensure_aware(dt: datetime) -> datetime:
    """SQLite doesn't preserve tzinfo through a DateTime(timezone=True)
    column (values round-trip naive), while Postgres does — normalize before
    comparing against utcnow() so this works on both."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
