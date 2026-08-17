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


class RegisterRequest(BaseModel):
    """Public self-registration — always creates a plain site user (role is
    never accepted from the client) with one or more initial MT5 accounts
    linked, since a user can have several accounts (even with the same
    broker)."""

    email: EmailStr
    password: str
    first_name: str
    last_name: str
    accounts: List[MT5AccountCreate] = Field(min_length=1)
    # Optional referral code from a client's referral link. Unknown/invalid
    # codes are ignored rather than rejected, so a bad code never blocks signup.
    referral_code: Optional[str] = None


class Token(BaseModel):
    """Schema for token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload data."""

    email: Optional[str] = None
