from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Literal, Optional

from app.schemas.mt5_account import MT5AccountCreate
from app.utils.validation import sanitize_email, validate_password_strength


class _EmailInput(BaseModel):
    """Base for any request schema taking an email — trims/validates it
    once here rather than repeating a field_validator on every subclass.
    See sanitize_email() for why this doesn't lowercase."""

    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def _sanitize_email(cls, v):
        return sanitize_email(v) if isinstance(v, str) else v


class LoginRequest(_EmailInput):
    """Schema for login request."""

    password: str
    # Which portal this login is for — "admin" (/admin/*) or "user" (the
    # public site). A login only succeeds if the account's role actually
    # belongs to that portal; see auth.login().
    portal: Literal["admin", "user"]
    # reCAPTCHA v2 response token from the widget on the login form.
    captcha_token: str


class RegisterRequest(_EmailInput):
    """Public self-registration — always creates a plain site user (role is
    never accepted from the client). Linking an MT5 account isn't required;
    accounts may be empty, and a user can add more than one later
    (even with the same broker)."""

    password: str
    first_name: str
    last_name: str
    accounts: List[MT5AccountCreate] = Field(default_factory=list)
    # Optional referral code from a client's referral link. Unknown/invalid
    # codes are ignored rather than rejected, so a bad code never blocks signup.
    referral_code: Optional[str] = None
    # Required to replace an email's still-unexpired pending registration —
    # must match the registration_token an earlier /auth/register call for
    # this same email returned. Without it, a second /auth/register for an
    # email that's still mid-verification is rejected rather than silently
    # overwriting the pending signup's password. Not needed for a brand-new
    # email, or once the previous pending registration has expired.
    registration_token: Optional[str] = None
    # reCAPTCHA v2 response token from the widget on the signup form.
    captcha_token: str

    @field_validator("password")
    @classmethod
    def _check_password_strength(cls, v):
        return validate_password_strength(v)


class Token(BaseModel):
    """Schema for token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload data."""

    email: Optional[str] = None


class OtpSentResponse(BaseModel):
    """Returned by /auth/resend-otp — the account isn't created yet, only a
    verification code was emailed."""

    message: str
    email: EmailStr
    expires_in: int  # seconds until the emailed code stops working


class RegisterInitiatedResponse(OtpSentResponse):
    """Returned by /auth/register. registration_token is the plaintext
    secret for this signup attempt — returned here and only here (never
    emailed) — that must be echoed back to /auth/verify-otp, and to a later
    /auth/register call for the same email if it needs correcting before
    that verification completes."""

    registration_token: str


class VerifyOtpRequest(_EmailInput):
    code: str
    registration_token: str


class ResendOtpRequest(_EmailInput):
    pass


class ForgotPasswordRequest(_EmailInput):
    # reCAPTCHA v2 response token from the widget on the forgot-password form.
    captcha_token: str


class ForgotPasswordResponse(BaseModel):
    """Returned by /auth/forgot-password. `flow` tells the client which
    screen to show next: "otp" for a self-service account (role "user",
    "client", or "super_admin") — proceed to the OTP + new-password screen
    using reset_token — or "notified" for any other admin-portal role, where
    no OTP was issued; a super_admin was notified to regenerate the password
    instead (see auth.forgot_password())."""

    flow: Literal["otp", "notified"]
    message: str
    email: EmailStr
    expires_in: int = 0  # seconds until the emailed code stops working; 0 for "notified"
    # Plaintext secret for this reset attempt, empty for "notified". Mirrors
    # RegisterInitiatedResponse.registration_token — returned only here
    # (never emailed), and must be echoed back to /auth/reset-password.
    reset_token: str = ""


class ResetPasswordRequest(_EmailInput):
    code: str
    reset_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _check_password_strength(cls, v):
        return validate_password_strength(v)


class ResendPasswordResetOtpRequest(_EmailInput):
    pass
