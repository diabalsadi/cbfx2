"""crm-backend's thin half of auth.py's Phase 3 split, per plan.md: admin
login + password reset, no self-registration (self-registration always
creates role="user", which has no business existing on the admin portal).

Also includes /resend-password-reset-otp alongside /forgot-password and
/reset-password — not explicitly named in plan.md's crm-backend list, but
it's the same reset flow's resend step (mirrors how user-backend's /register
"including OTP" bundles register+verify+resend together); flagging this as
an interpretation rather than a literal instruction. GET /me is
deliberately omitted — crm-backend already has a full users.py copy
(unambiguous router), which provides the equivalent GET/PATCH /users/me.

Both crm-backend and user-backend must share the same JWT secret so a token
minted by either is valid on both (needed for the role="client" dual-portal
case) — this file's login()/reset_password() reuse backend_shared's
create_access_token exactly as user-backend's auth.py does, so that already
holds as long as both services' JWT_SECRET env var matches.
"""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend_shared.database import get_db
from backend_shared.models import user as models
from backend_shared.models.password_reset import PasswordReset
from backend_shared.models.notification import Notification
from backend_shared.schemas.user import ADMIN_ROLES
from backend_shared.schemas import auth as auth_schemas
from backend_shared.utils.auth import (
    get_password_hash,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from backend_shared.auth import login_service
from backend_shared.utils.geo import extract_client_ip
from backend_shared.utils.otp import (
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
from backend_shared.utils.mailer import send_password_reset_otp_email
from backend_shared.utils.recaptcha import verify_recaptcha

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


@router.post("/login", response_model=auth_schemas.Token)
def login(login_data: auth_schemas.LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Login and receive a JWT access token. `portal` scopes which accounts
    may authenticate here: admin-portal roles (super_admin/editor/broker) can
    only sign in with portal="admin", and plain site users only with
    portal="user" — a valid password for the wrong portal is rejected, so
    admin and site credentials never work interchangeably."""
    _require_captcha(request, login_data.captcha_token)
    return login_service.authenticate(
        db, login_data.email, login_data.password, login_data.portal
    )


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
    returning a JWT so the client can be logged straight in."""
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
