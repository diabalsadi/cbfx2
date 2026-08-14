from pydantic import BaseModel, EmailStr
from typing import Literal, Optional


class LoginRequest(BaseModel):
    """Schema for login request."""

    email: EmailStr
    password: str
    # Which portal this login is for — "admin" (/admin/*) or "user" (the
    # public site). A login only succeeds if the account's role actually
    # belongs to that portal; see auth.login().
    portal: Literal["admin", "user"]


class Token(BaseModel):
    """Schema for token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload data."""

    email: Optional[str] = None
