from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import user as models
from app.models.broker import Broker
from app.models.mt5_account import MT5Account
from app.schemas import user as user_schemas
from app.schemas.user import ADMIN_ROLES
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
def register(payload: auth_schemas.RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Register a new site user, optionally linking one or more MT5 accounts
    in the same step — a user can have several accounts, even with the same
    broker, but none are required to sign up. Always creates role="user" —
    admin-portal roles are only granted afterward by an existing super_admin
    via PATCH /users/{email}/role."""
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="First and last name are required")

    # Validate and normalize every requested MT5 account before writing
    # anything, so a bad entry anywhere in the list fails the whole request.
    seen_pairs = set()
    normalized_accounts = []
    for account in payload.accounts:
        mt5_number = account.mt5_number.strip()
        if not mt5_number:
            raise HTTPException(status_code=400, detail="MT5 account number is required")

        broker = (
            db.query(Broker)
            .filter(Broker.id == account.broker_id, Broker.status == "active")
            .first()
        )
        if not broker:
            raise HTTPException(status_code=400, detail="Invalid broker selected")

        pair = (broker.id, mt5_number)
        if pair in seen_pairs:
            raise HTTPException(status_code=400, detail="Duplicate MT5 account in request")
        seen_pairs.add(pair)

        existing_mt5 = (
            db.query(MT5Account)
            .filter(MT5Account.broker_id == broker.id, MT5Account.mt5_number == mt5_number)
            .first()
        )
        if existing_mt5:
            raise HTTPException(status_code=400, detail="This MT5 account is already linked")

        normalized_accounts.append((broker.id, mt5_number))

    country_code, region = detect_region(extract_client_ip(request))

    referred_by = None
    if payload.referral_code:
        referrer = (
            db.query(models.User)
            .filter(models.User.referral_code == payload.referral_code)
            .first()
        )
        if referrer:
            referred_by = referrer.email

    db_user = models.User(
        email=payload.email,
        name=f"{first_name} {last_name}",
        role="user",
        region=region,
        country_code=country_code,
        referred_by=referred_by,
        hashed_password=get_password_hash(payload.password),
    )
    db.add(db_user)
    db.flush()  # assign the user before the MT5 accounts reference it

    for broker_id, mt5_number in normalized_accounts:
        db.add(MT5Account(user_email=db_user.email, broker_id=broker_id, mt5_number=mt5_number))

    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login", response_model=auth_schemas.Token)
def login(login_data: auth_schemas.LoginRequest, db: Session = Depends(get_db)):
    """Login and receive a JWT access token. `portal` scopes which accounts
    may authenticate here: admin-portal roles (super_admin/editor/broker) can
    only sign in with portal="admin", and plain site users only with
    portal="user" — a valid password for the wrong portal is rejected, so
    admin and site credentials never work interchangeably."""
    user = db.query(models.User).filter(models.User.email == login_data.email).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
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
    if login_data.portal == "admin" and not can_use_admin_portal:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account isn't authorized for the admin portal",
        )
    if login_data.portal == "user" and is_admin_account:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts must sign in through the admin portal",
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
