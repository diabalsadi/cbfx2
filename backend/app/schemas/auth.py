from pydantic import BaseModel, EmailStr, Field
from typing import List, Literal, Optional

from app.schemas.mt5_account import MT5AccountCreate


class LoginRequest(BaseModel):
    """Schema for login request."""

    email: EmailStr
    password: str
    # Which portal this login is for — "admin" (/admin/*) or "user" (the
    # public site). A login only succeeds if the account's role actually
    # belongs to that portal; see auth.login().
    portal: Literal["admin", "user"]
    # reCAPTCHA v2 response token from the widget on the login form.
    captcha_token: str


class RegisterRequest(BaseModel):
    """Public self-registration — always creates a plain site user (role is
    never accepted from the client). Linking an MT5 account isn't required;
    accounts may be empty, and a user can add more than one later
    (even with the same broker)."""

    email: EmailStr
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


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str
    registration_token: str


class ResendOtpRequest(BaseModel):
    email: EmailStr
