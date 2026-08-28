from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User
from app.services.rebate_calculation import create_rebate_payout, pending_payout_summary
from app.utils.auth import get_current_user

router = APIRouter(prefix="/rebate-payouts", tags=["rebate-payouts"])

# Actual crediting is a super_admin-only action — unlike most cashback admin
# work, this one directly moves money, so it's deliberately not opened up to
# the "broker" role the way broker-management endpoints are.
ALLOWED_ROLES = {"super_admin"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


class PendingPayout(BaseModel):
    mt5_account_id: str
    user_email: str
    mt5_number: str
    broker_name: str
    expected_amount: float
    trade_count: int


class RebatePayoutCreate(BaseModel):
    mt5_account_id: str
    actual_amount: float
    note: Optional[str] = None


class RebatePayout(BaseModel):
    id: str
    mt5_account_id: str
    expected_amount: float
    actual_amount: float
    trade_count: int
    note: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/pending", response_model=List[PendingPayout])
def list_pending_payouts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Every MT5 account with priced, unsettled trades — expected_amount is
    a reference figure only; nothing has been credited yet."""
    return pending_payout_summary(db)


@router.post("", response_model=RebatePayout, status_code=status.HTTP_201_CREATED)
def issue_payout(
    payload: RebatePayoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Settles every pending priced trade for one account into a single
    payout, crediting actual_amount to the account's wallet."""
    if payload.actual_amount < 0:
        raise HTTPException(status_code=400, detail="Actual amount cannot be negative")
    try:
        return create_rebate_payout(
            db,
            mt5_account_id=payload.mt5_account_id,
            actual_amount=payload.actual_amount,
            note=payload.note,
            admin_email=current_user.email,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
