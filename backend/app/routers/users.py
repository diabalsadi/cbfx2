from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.utils.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

VALID_ROLES = {"super_admin", "editor", "broker"}


def require_super_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


class RoleUpdate(BaseModel):
    role: str


@router.get("/", response_model=List[UserSchema])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    return db.query(User).all()


@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(get_current_user)):
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
