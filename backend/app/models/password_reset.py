from sqlalchemy import Column, String, DateTime, Integer
from sqlalchemy.sql import func
from app.database import Base


class PasswordReset(Base):
    """A forgot-password request, keyed by email. For self-service accounts
    (role "user"/"client"/"super_admin") this holds an OTP + reset token
    exactly like PendingRegistration does for signup — an *unexpired* row may
    only be verified or replaced by whoever holds token_hash's plaintext
    counterpart, returned only in the direct HTTPS response to
    /auth/forgot-password (never emailed).

    For non-super_admin admin-portal accounts (editor/broker/etc.), no
    self-service reset is offered — see auth.forgot_password() — so
    otp_hash/token_hash/otp_expires_at stay unset and this row exists purely
    to rate-limit repeated notify-the-admins requests via last_sent_at."""

    __tablename__ = "password_resets"

    email = Column(String, primary_key=True, index=True)
    token_hash = Column(String, nullable=True)
    otp_hash = Column(String, nullable=True)
    otp_expires_at = Column(DateTime(timezone=True), nullable=True)
    attempts = Column(Integer, default=0)
    last_sent_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
