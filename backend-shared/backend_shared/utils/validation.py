import re

MAX_EMAIL_LENGTH = 254  # RFC 5321 5.3.1.1
MAX_PASSWORD_LENGTH = 128  # bcrypt only uses the first 72 bytes anyway; this
# just keeps someone from hashing a multi-megabyte string as a "password".


def sanitize_email(email: str) -> str:
    """Trim whitespace and reject control characters. Doesn't lowercase —
    User.email is the primary key and this app already has real accounts
    registered with whatever casing they typed, so case-folding here would
    silently break their existing logins rather than "sanitize" anything.
    EmailStr already rejects most malformed input; this is the extra layer
    against embedded newlines/NULs (which could otherwise reach mailer.py's
    "To" header) and unreasonably long input."""
    value = email.strip()
    if len(value) > MAX_EMAIL_LENGTH:
        raise ValueError(f"Email must be {MAX_EMAIL_LENGTH} characters or fewer")
    if any(ord(c) < 32 for c in value):
        raise ValueError("Email contains invalid characters")
    return value


_HAS_LOWER = re.compile(r"[a-z]")
_HAS_UPPER = re.compile(r"[A-Z]")
_HAS_DIGIT = re.compile(r"\d")
_HAS_SPECIAL = re.compile(r"[^\w\s]")


def validate_password_strength(password: str) -> str:
    """At least 8 characters, one lowercase, one uppercase, one digit, one
    special character. Applied everywhere a password is set: signup, self
    password change, password reset, and admin-created accounts — enforcing
    it at only one of those would leave the others as a bypass."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if len(password) > MAX_PASSWORD_LENGTH:
        raise ValueError(f"Password must be {MAX_PASSWORD_LENGTH} characters or fewer")
    if not _HAS_LOWER.search(password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not _HAS_UPPER.search(password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not _HAS_DIGIT.search(password):
        raise ValueError("Password must contain at least one number")
    if not _HAS_SPECIAL.search(password):
        raise ValueError("Password must contain at least one special character")
    return password
