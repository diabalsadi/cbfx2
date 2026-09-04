"""User-owned withdrawal request create/list — user-backend's half of
plan.md Phase 3's withdrawal_requests.py split. Admin review/approve/reject
lives only on crm-backend (clean split, no duplication)."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend_shared.database import get_db
from backend_shared.models.user import User
from backend_shared.schemas.withdrawal_request import (
    WithdrawalRequestCreate,
    WithdrawalRequest as WithdrawalRequestSchema,
)
from backend_shared.services import withdrawal
from backend_shared.utils.auth import get_current_user

router = APIRouter(prefix="/withdrawal-requests", tags=["withdrawal-requests"])


@router.post("", response_model=WithdrawalRequestSchema, status_code=status.HTTP_201_CREATED)
def create_withdrawal_request(
    payload: WithdrawalRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return withdrawal.create_withdrawal_request(
            db,
            user_email=current_user.email,
            mt5_account_id=payload.mt5_account_id,
            amount=payload.amount,
            method=payload.method,
            destination_details=payload.destination_details,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me", response_model=List[WithdrawalRequestSchema])
def list_my_withdrawal_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return withdrawal.list_my_withdrawal_requests(db, current_user.email)
