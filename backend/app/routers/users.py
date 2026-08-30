import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    User as UserSchema,
    UserSelfUpdate,
    AdminUserCreate,
    AdminUserUpdate,
    ADMIN_ROLES,
)
from app.utils.auth import get_current_user, get_password_hash, verify_password, generate_temp_password
from app.utils.mailer import send_new_credentials_email

router = APIRouter(prefix="/users", tags=["users"])

# Roles assignable via PATCH /{email}/role. Includes "client" alongside the
# admin-portal roles since client accounts are also admin-managed, even
# though "client" itself stays on the site portal (not in ADMIN_ROLES).
VALID_ROLES = ADMIN_ROLES | {"client"}


def require_super_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


class RoleUpdate(BaseModel):
    role: str


def _generate_referral_code(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(8))
        if not db.query(User).filter(User.referral_code == code).first():
            return code


@router.get("/", response_model=List[UserSchema])
def list_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.all()


@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Admin-created account (e.g. a client), bypassing the public
    /auth/register flow and its MT5-account requirement."""
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    referral_code = payload.referral_code
    if referral_code:
        if db.query(User).filter(User.referral_code == referral_code).first():
            raise HTTPException(status_code=400, detail="Referral code already in use")
    elif payload.role == "client":
        referral_code = _generate_referral_code(db)

    user = User(
        email=payload.email,
        name=payload.name,
        role=payload.role,
        referral_code=referral_code,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{email}", response_model=UserSchema)
def update_user(
    email: str,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        user.name = payload.name.strip()

    if payload.referral_code is not None:
        code = payload.referral_code.strip()
        if not code:
            raise HTTPException(status_code=400, detail="Referral code cannot be empty")
        existing = db.query(User).filter(User.referral_code == code).first()
        if existing and existing.email != user.email:
            raise HTTPException(status_code=400, detail="Referral code already in use")
        user.referral_code = code

    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserSchema)
def update_me(
    payload: UserSelfUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Self-service profile update for any signed-in user (any role). Email
    is intentionally not accepted here — it's the account's primary key, so
    it can never be changed via this endpoint."""
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        current_user.name = payload.name.strip()

    if payload.new_password is not None:
        if not payload.current_password or not verify_password(
            payload.current_password, current_user.hashed_password
        ):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        current_user.hashed_password = get_password_hash(payload.new_password)
        # Covers both a routine self-service password change and the
        # required change after a super_admin-regenerated temp password —
        # this is also how /admin/change-password clears the flag, by
        # calling this same endpoint with the temp password as current_password.
        current_user.must_change_password = False

    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/{email}/role", response_model=UserSchema)
def update_user_role(
    email: str,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    if payload.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email == current_user.email:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.post("/{email}/regenerate-password", response_model=UserSchema)
def regenerate_password(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Issue a new random password for any account and email it to them —
    the route an editor/broker's "Forgot password?" request lands on (see
    auth.forgot_password(), which notifies super_admins instead of offering
    self-service OTP reset to those roles). Forces a /admin/change-password
    stop on the account's next login via must_change_password."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_password = generate_temp_password()
    try:
        # Sent before committing — if delivery fails, the account's existing
        # password stays valid instead of silently locking them out of a
        # password nobody received.
        send_new_credentials_email(user.email, user.name or "", temp_password)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't send the new password email. Please try again in a moment.",
        )

    user.hashed_password = get_password_hash(temp_password)
    user.must_change_password = True
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{email}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    if email == current_user.email:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
