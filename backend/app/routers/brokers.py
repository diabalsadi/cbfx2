from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.broker import Broker
from app.schemas.broker import BrokerCreate, BrokerUpdate, Broker as BrokerSchema
from app.utils.auth import get_current_user, get_password_hash, generate_temp_password
from app.utils.cache import purge_public_cache
from app.utils.mailer import send_broker_welcome_email
from app.models.user import User

router = APIRouter(prefix="/brokers", tags=["brokers"])

ALLOWED_ROLES = {"super_admin", "broker"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


@router.get("/", response_model=List[BrokerSchema])
def list_brokers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    q = db.query(Broker)
    if current_user.role != "super_admin":
        # A "broker"-role account only manages its own listing(s) — not
        # every broker in the system.
        q = q.filter(Broker.owner_email == current_user.email)
    return q.order_by(Broker.created_at.desc()).all()


@router.get("/{broker_id}", response_model=BrokerSchema)
def get_broker(
    broker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    if current_user.role != "super_admin" and broker.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorised")
    return broker


@router.post("/", response_model=BrokerSchema, status_code=status.HTTP_201_CREATED)
def create_broker(
    payload: BrokerCreate,
    db: Session = Depends(get_db),
    # Onboarding a whole new broker listing (and deciding who, if anyone,
    # manages it) is an admin action — a "broker" account manages an
    # existing listing it owns, it doesn't create new ones.
    current_user: User = Depends(require_roles({"super_admin"})),
):
    broker = Broker(**payload.model_dump())

    new_user = None
    if payload.owner_email:
        existing = db.query(User).filter(User.email == payload.owner_email).first()
        if existing:
            # Re-linking an existing broker-role account to a (new) listing is
            # fine; hijacking some other role's account by typing its email
            # into this form is not.
            if existing.role != "broker":
                raise HTTPException(
                    status_code=400,
                    detail="This email belongs to an existing non-broker account",
                )
        else:
            temp_password = generate_temp_password()
            try:
                # Sent before adding/committing anything — if delivery fails,
                # no half-provisioned broker+login is left behind with
                # credentials nobody received (see users.regenerate_password()
                # for the same pattern).
                send_broker_welcome_email(payload.owner_email, broker.name, temp_password)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Couldn't send the welcome email. Please try again in a moment.",
                )
            new_user = User(
                email=payload.owner_email,
                name=broker.name,
                role="broker",
                hashed_password=get_password_hash(temp_password),
                must_change_password=True,
            )
            db.add(new_user)

    db.add(broker)
    db.commit()
    db.refresh(broker)
    purge_public_cache()
    return broker


@router.put("/{broker_id}", response_model=BrokerSchema)
def update_broker(
    broker_id: str,
    payload: BrokerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    if current_user.role != "super_admin" and broker.owner_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorised")

    updates = payload.model_dump(exclude_unset=True)
    if current_user.role != "super_admin":
        # Only a super_admin may reassign who owns a broker listing, or set
        # its editorial star rating.
        updates.pop("owner_email", None)
        updates.pop("rating", None)
    for field, value in updates.items():
        setattr(broker, field, value)
    db.commit()
    db.refresh(broker)
    purge_public_cache()
    return broker


@router.delete("/{broker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_broker(
    broker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"super_admin"})),
):
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    db.delete(broker)
    db.commit()
    purge_public_cache()
