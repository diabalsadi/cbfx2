from datetime import timedelta
from typing import List, Tuple
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import user as models
from app.models.broker import Broker
from app.models.mt5_account import MT5Account
from app.models.pending_registration import PendingRegistration
from app.models.password_reset import PasswordReset
from app.models.notification import Notification
from app.schemas import user as user_schemas
from app.schemas.user import ADMIN_ROLES
from app.schemas import auth as auth_schemas
from app.schemas.mt5_account import MT5AccountCreate
from app.utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.utils.geo import detect_region, extract_client_ip
from app.utils.otp import (
    generate_otp,
    hash_otp,
    otp_expiry,
    utcnow,
    ensure_aware,
    generate_registration_token,
    hash_token,
    secure_compare,
    OTP_TTL_MINUTES,
    OTP_RESEND_COOLDOWN_SECONDS,
    OTP_MAX_ATTEMPTS,
)
from app.utils.mailer import send_otp_email, send_password_reset_otp_email
from app.utils.recaptcha import verify_recaptcha

router = APIRouter(
    prefix="/auth",
    tags=["authentication"],
    responses={404: {"description": "Not found"}},
)


def _require_captcha(request: Request, token: str) -> None:
    try:
        ok = verify_recaptcha(token, extract_client_ip(request))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    if not ok:
        raise HTTPException(status_code=400, detail="Captcha verification failed. Please try again.")


def _validate_accounts(db: Session, accounts: List[MT5AccountCreate]) -> List[Tuple[str, str]]:
    """Validate and normalize a set of requested MT5 accounts — used both
    when staging a registration and again at OTP verification time, since a
    broker or MT5 number can change or get taken during the 5-minute window
    between the two."""
    seen_pairs = set()
    normalized_accounts = []
    for account in accounts:
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

    return normalized_accounts


@router.post("/register", response_model=auth_schemas.RegisterInitiatedResponse)
def register(payload: auth_schemas.RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Start registering a new site user. Doesn't create the account yet —
    validates everything (uniqueness, MT5 accounts, referral code), stages it
    in PendingRegistration, and emails a 6-digit OTP that must be confirmed
    via POST /auth/verify-otp within 5 minutes to actually create the User
    row. Always ends up creating role="user" — admin-portal roles are only
    granted afterward by an existing super_admin via PATCH /users/{email}/role."""
    _require_captcha(request, payload.captcha_token)

    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="First and last name are required")

    normalized_accounts = _validate_accounts(db, payload.accounts)

    existing_pending = (
        db.query(PendingRegistration).filter(PendingRegistration.email == payload.email).first()
    )
    if existing_pending:
        still_active = ensure_aware(existing_pending.otp_expires_at) >= utcnow()
        if still_active:
            # Someone (hopefully the same caller) already has a live signup
            # in flight for this email. Only the party holding its
            # registration_token — handed back solely in the original
            # /auth/register response, never emailed — may replace it;
            # otherwise anyone who merely knows this email address could
            # swap in their own password ahead of the real owner finishing
            # verification.
            provided = payload.registration_token
            if not provided or not secure_compare(hash_token(provided), existing_pending.token_hash or ""):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A signup for this email is already in progress. Check your inbox, or try again once it expires.",
                )

            if existing_pending.last_sent_at:
                elapsed = (utcnow() - ensure_aware(existing_pending.last_sent_at)).total_seconds()
                if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Please wait {int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code",
                    )
        # else: the previous attempt expired unclaimed — anyone may start a
        # fresh one for this email, same as if no row existed at all.

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

    code = generate_otp()
    token = generate_registration_token()
    now = utcnow()
    accounts_json = [{"broker_id": b, "mt5_number": m} for b, m in normalized_accounts]

    if existing_pending:
        pending = existing_pending
        pending.name = f"{first_name} {last_name}"
        pending.hashed_password = get_password_hash(payload.password)
        pending.region = region
        pending.country_code = country_code
        pending.referred_by = referred_by
        pending.accounts = accounts_json
        pending.token_hash = hash_token(token)
        pending.otp_hash = hash_otp(code)
        pending.otp_expires_at = otp_expiry()
        pending.attempts = 0
        pending.last_sent_at = now
    else:
        pending = PendingRegistration(
            email=payload.email,
            name=f"{first_name} {last_name}",
            hashed_password=get_password_hash(payload.password),
            region=region,
            country_code=country_code,
            referred_by=referred_by,
            accounts=accounts_json,
            token_hash=hash_token(token),
            otp_hash=hash_otp(code),
            otp_expires_at=otp_expiry(),
            attempts=0,
            last_sent_at=now,
        )
        db.add(pending)

    db.commit()

    try:
        send_otp_email(payload.email, first_name, code)
    except Exception:
        # The pending registration is already saved — the client can retry
        # via this same endpoint (with the token below) or /auth/resend-otp
        # once mail delivery works, without redoing the whole form.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't send the verification email. Please try again in a moment.",
        )

    return auth_schemas.RegisterInitiatedResponse(
        message="Verification code sent to your email",
        email=payload.email,
        expires_in=OTP_TTL_MINUTES * 60,
        registration_token=token,
    )


@router.post("/verify-otp", response_model=auth_schemas.Token)
def verify_otp(payload: auth_schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    """Confirm the OTP from /auth/register and actually create the User
    account, returning a JWT so the client can be logged straight in."""
    pending = (
        db.query(PendingRegistration).filter(PendingRegistration.email == payload.email).first()
    )
    if not pending or not secure_compare(hash_token(payload.registration_token), pending.token_hash or ""):
        # Same error for "no such pending registration" and "wrong token"
        # so this can't be used to probe whether an email has a signup in
        # progress — the token only makes sense together with the email
        # anyway (see /auth/register).
        raise HTTPException(
            status_code=400, detail="No pending registration found for this email. Please sign up again."
        )

    if pending.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=400, detail="Too many incorrect attempts. Request a new code."
        )

    if ensure_aware(pending.otp_expires_at) < utcnow():
        raise HTTPException(status_code=400, detail="Code expired. Request a new code.")

    if not secure_compare(hash_otp(payload.code.strip()), pending.otp_hash):
        pending.attempts += 1
        db.commit()
        remaining = OTP_MAX_ATTEMPTS - pending.attempts
        raise HTTPException(status_code=400, detail=f"Incorrect code. {remaining} attempt(s) left.")

    if db.query(models.User).filter(models.User.email == pending.email).first():
        db.delete(pending)
        db.commit()
        raise HTTPException(status_code=400, detail="Email already registered")

    normalized_accounts = _validate_accounts(
        db, [MT5AccountCreate(broker_id=a["broker_id"], mt5_number=a["mt5_number"]) for a in pending.accounts]
    )

    db_user = models.User(
        email=pending.email,
        name=pending.name,
        role="user",
        region=pending.region,
        country_code=pending.country_code,
        referred_by=pending.referred_by,
        hashed_password=pending.hashed_password,
    )
    db.add(db_user)
    db.flush()  # assign the user before the MT5 accounts reference it

    for broker_id, mt5_number in normalized_accounts:
        db.add(MT5Account(user_email=db_user.email, broker_id=broker_id, mt5_number=mt5_number))

    db.delete(pending)
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/resend-otp", response_model=auth_schemas.OtpSentResponse)
def resend_otp(payload: auth_schemas.ResendOtpRequest, db: Session = Depends(get_db)):
    """Issue a fresh OTP for a still-pending registration, replacing
    whichever code was sent before (which stops working immediately)."""
    pending = (
        db.query(PendingRegistration).filter(PendingRegistration.email == payload.email).first()
    )
    if not pending:
        raise HTTPException(
            status_code=404, detail="No pending registration found. Please sign up again."
        )

    if pending.last_sent_at:
        elapsed = (utcnow() - ensure_aware(pending.last_sent_at)).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code",
            )

    code = generate_otp()
    pending.otp_hash = hash_otp(code)
    pending.otp_expires_at = otp_expiry()
    pending.attempts = 0
    pending.last_sent_at = utcnow()
    db.commit()

    first_name = pending.name.split(" ")[0] if pending.name else ""
    try:
        send_otp_email(payload.email, first_name, code)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't send the verification email. Please try again in a moment.",
        )

    return auth_schemas.OtpSentResponse(
        message="Verification code resent",
        email=payload.email,
        expires_in=OTP_TTL_MINUTES * 60,
    )


@router.post("/login", response_model=auth_schemas.Token)
def login(login_data: auth_schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Login and receive a JWT access token. `portal` scopes which accounts
    may authenticate here: admin-portal roles (super_admin/editor/broker) can
    only sign in with portal="admin", and plain site users only with
    portal="user" — a valid password for the wrong portal is rejected, so
    admin and site credentials never work interchangeably."""
    _require_captcha(request, login_data.captcha_token)

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


def _notify_admins_password_reset_requested(db: Session, user: models.User) -> None:
    """Fan out one Notification per super_admin — called when a
    non-super_admin admin-portal account (editor/broker/etc.) requests a
    password reset. Those roles don't get self-service OTP reset (see
    forgot_password()); a super_admin has to regenerate the password via
    POST /users/{email}/regenerate-password instead."""
    admins = db.query(models.User).filter(models.User.role == "super_admin").all()
    for admin in admins:
        db.add(
            Notification(
                recipient_email=admin.email,
                type="password_reset_requested",
                title="Password reset requested",
                body=f"{user.name or user.email} ({user.email}) requested a password reset. Regenerate their password from Users.",
                related_type="user",
                related_id=user.email,
            )
        )
    db.commit()


@router.post("/forgot-password", response_model=auth_schemas.ForgotPasswordResponse)
def forgot_password(payload: auth_schemas.ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Start a password reset. Self-service accounts — role "user",
    "client", or "super_admin" — get an emailed OTP + reset_token, the same
    pattern as /auth/register (confirmed via /auth/reset-password). Any
    other admin-portal role (editor/broker/etc.) doesn't get self-service
    reset; every super_admin is notified instead to regenerate the password
    via POST /users/{email}/regenerate-password."""
    _require_captcha(request, payload.captcha_token)

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")

    existing = db.query(PasswordReset).filter(PasswordReset.email == payload.email).first()
    if existing and existing.last_sent_at:
        elapsed = (utcnow() - ensure_aware(existing.last_sent_at)).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)}s before trying again",
            )

    if user.role in ADMIN_ROLES and user.role != "super_admin":
        # No self-service reset for these roles — just track last_sent_at on
        # this row for the cooldown check above, no OTP/token involved.
        if existing:
            existing.last_sent_at = utcnow()
        else:
            db.add(PasswordReset(email=user.email, last_sent_at=utcnow()))
        db.commit()
        _notify_admins_password_reset_requested(db, user)
        return auth_schemas.ForgotPasswordResponse(
            flow="notified",
            message="An administrator has been notified and will email you a new password shortly.",
            email=user.email,
        )

    code = generate_otp()
    token = generate_registration_token()
    now = utcnow()

    reset = existing or PasswordReset(email=user.email)
    reset.token_hash = hash_token(token)
    reset.otp_hash = hash_otp(code)
    reset.otp_expires_at = otp_expiry()
    reset.attempts = 0
    reset.last_sent_at = now
    if not existing:
        db.add(reset)
    db.commit()

    try:
        send_password_reset_otp_email(user.email, user.name or "", code)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't send the verification email. Please try again in a moment.",
        )

    return auth_schemas.ForgotPasswordResponse(
        flow="otp",
        message="Verification code sent to your email",
        email=user.email,
        expires_in=OTP_TTL_MINUTES * 60,
        reset_token=token,
    )


@router.post("/reset-password", response_model=auth_schemas.Token)
def reset_password(payload: auth_schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """Confirm the OTP from /auth/forgot-password and set a new password,
    returning a JWT so the client can be logged straight in. Mirrors
    /auth/verify-otp's verification logic."""
    reset = db.query(PasswordReset).filter(PasswordReset.email == payload.email).first()
    if not reset or not reset.token_hash or not secure_compare(hash_token(payload.reset_token), reset.token_hash):
        raise HTTPException(
            status_code=400, detail="No pending password reset found for this email. Please start again."
        )

    if reset.attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Too many incorrect attempts. Request a new code.")

    if not reset.otp_expires_at or ensure_aware(reset.otp_expires_at) < utcnow():
        raise HTTPException(status_code=400, detail="Code expired. Request a new code.")

    if not secure_compare(hash_otp(payload.code.strip()), reset.otp_hash or ""):
        reset.attempts += 1
        db.commit()
        remaining = OTP_MAX_ATTEMPTS - reset.attempts
        raise HTTPException(status_code=400, detail=f"Incorrect code. {remaining} attempt(s) left.")

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        db.delete(reset)
        db.commit()
        raise HTTPException(status_code=400, detail="No account found with this email")

    user.hashed_password = get_password_hash(payload.new_password)
    # A super_admin-regenerated temp password would already be moot after a
    # self-service reset, but clear it defensively so a stale flag can never
    # force /admin/change-password on someone who just picked their own
    # password here.
    user.must_change_password = False
    db.delete(reset)
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/resend-password-reset-otp", response_model=auth_schemas.OtpSentResponse)
def resend_password_reset_otp(payload: auth_schemas.ResendPasswordResetOtpRequest, db: Session = Depends(get_db)):
    """Issue a fresh OTP for a still-pending password reset, replacing
    whichever code was sent before (which stops working immediately)."""
    reset = (
        db.query(PasswordReset)
        .filter(PasswordReset.email == payload.email, PasswordReset.otp_hash.isnot(None))
        .first()
    )
    if not reset:
        raise HTTPException(status_code=404, detail="No pending password reset found. Please start again.")

    if reset.last_sent_at:
        elapsed = (utcnow() - ensure_aware(reset.last_sent_at)).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)}s before requesting another code",
            )

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")

    code = generate_otp()
    reset.otp_hash = hash_otp(code)
    reset.otp_expires_at = otp_expiry()
    reset.attempts = 0
    reset.last_sent_at = utcnow()
    db.commit()

    try:
        send_password_reset_otp_email(user.email, user.name or "", code)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't send the verification email. Please try again in a moment.",
        )

    return auth_schemas.OtpSentResponse(
        message="Verification code resent", email=user.email, expires_in=OTP_TTL_MINUTES * 60
    )
