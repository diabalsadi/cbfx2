from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.withdrawal_request import (
    WithdrawalRequestCreate,
    WithdrawalReviewDecision,
    WithdrawalRequest as WithdrawalRequestSchema,
)
from app.services import withdrawal
from app.utils.auth import get_current_user

router = APIRouter(prefix="/withdrawal-requests", tags=["withdrawal-requests"])


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


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


@router.get("", response_model=List[WithdrawalRequestSchema])
def list_withdrawal_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"super_admin"})),
):
    return withdrawal.list_all_withdrawal_requests(db, status_filter=status_filter)


@router.post("/{request_id}/review", response_model=WithdrawalRequestSchema)
def review_withdrawal_request(
    request_id: str,
    payload: WithdrawalReviewDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"super_admin"})),
):
    try:
        return withdrawal.review_withdrawal_request(
            db,
            request_id=request_id,
            decision=payload.decision,
            admin_note=payload.admin_note,
            admin_email=current_user.email,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
