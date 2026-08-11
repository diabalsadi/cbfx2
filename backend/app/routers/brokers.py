from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.broker import Broker
from app.schemas.broker import BrokerCreate, BrokerUpdate, Broker as BrokerSchema
from app.utils.auth import get_current_user
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
    return db.query(Broker).order_by(Broker.created_at.desc()).all()


@router.get("/{broker_id}", response_model=BrokerSchema)
def get_broker(
    broker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    broker = db.query(Broker).filter(Broker.id == broker_id).first()
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")
    return broker


@router.post("/", response_model=BrokerSchema, status_code=status.HTTP_201_CREATED)
def create_broker(
    payload: BrokerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    broker = Broker(**payload.model_dump())
    db.add(broker)
    db.commit()
    db.refresh(broker)
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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(broker, field, value)
    db.commit()
    db.refresh(broker)
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
