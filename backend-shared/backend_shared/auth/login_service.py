from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend_shared.models.user import User
from backend_shared.schemas.user import ADMIN_ROLES
from backend_shared.utils.auth import (
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)


def authenticate(db: Session, email: str, password: str, portal: str) -> dict:
    """Verify credentials and portal authorization, returning a JWT token dict.

    `portal` scopes which accounts may authenticate: admin-portal roles
    (super_admin/editor/broker) can only sign in with portal="admin", and
    plain site users only with portal="user" — a valid password for the
    wrong portal is rejected, so admin and site credentials never work
    interchangeably. role="client" accounts may use either portal.
    """
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    is_admin_account = user.role in ADMIN_ROLES
    # "client" accounts are admin-managed but not admin staff — they may sign
    # in on either portal: the admin login (landing on their own referral
    # view) or the public site login (the /referrals dashboard).
    can_use_admin_portal = is_admin_account or user.role == "client"
    if portal == "admin" and not can_use_admin_portal:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account isn't authorized for the admin portal",
        )
    if portal == "user" and is_admin_account:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts must sign in through the admin portal",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}
