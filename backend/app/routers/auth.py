from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import user as models
from app.schemas import user as user_schemas
from app.schemas import auth as auth_schemas
from app.utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.utils.geo import detect_region, extract_client_ip

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={404: {"description": "Not found"}},
)


@router.post(
    "/register", response_model=user_schemas.User, status_code=status.HTTP_201_CREATED
)
def register(user: user_schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    """Register a new user."""
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    _, region = detect_region(extract_client_ip(request))

    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        role=user.role,
        region=region,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=auth_schemas.Token)
def login(login_data: auth_schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login and receive a JWT access token."""
    user = db.query(models.User).filter(models.User.email == login_data.email).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=user_schemas.User)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current authenticated user information."""
    return current_user
