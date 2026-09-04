"""Admin-only, read-only view of MT5 accounts — duplicated from
user-backend (the owner of the full mt5-accounts CRUD) per plan.md Phase 3's
mixed-file split. crm-frontend's admin dashboard needs this visibility;
everything else (linking/reconnecting/removing an account, own-wallet
history) is user-owned and lives only on user-backend.
"""
import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from backend_shared.database import get_db
from backend_shared.models.broker import Broker
from backend_shared.models.mt5_account import MT5Account
from backend_shared.models.user import User
from backend_shared.schemas.mt5_account import AdminMT5Account
from backend_shared.utils.active_users import active_user_emails
from backend_shared.auth.rbac import require_roles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mt5-accounts", tags=["mt5-accounts"])

ADMIN_STATS_ROLES = {"super_admin", "broker"}


@router.get("/active-count")
def get_active_user_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ADMIN_STATS_ROLES)),
):
    """Count of users with a MetaApi-verified MT5 account at a
    cashback-eligible broker — see app/utils/active_users.py. Admin overview
    dashboard KPI. Site-wide for super_admin; a "broker" role account only
    sees users active with the broker listing it owns (see
    brokers.py's owner_email scoping) — not every other broker's users."""
    broker_id = None
    if current_user.role == "broker":
        broker = db.query(Broker).filter(Broker.owner_email == current_user.email).first()
        if not broker:
            return {"active_users": 0}
        broker_id = broker.id
    return {"active_users": len(active_user_emails(db, broker_id=broker_id))}


@router.get("/admin", response_model=List[AdminMT5Account])
def list_accounts_for_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ADMIN_STATS_ROLES)),
):
    """Admin visibility into every linked MT5 account's MetaApi connection
    health — gap-analysis item 3.2 / METAAPI_INTEGRATION_ARCHITECTURE.md §10
    step 5. Site-wide for super_admin; a "broker" role account only sees
    accounts at the broker it owns, same scoping as get_active_user_count."""
    query = db.query(MT5Account)
    if current_user.role == "broker":
        broker = db.query(Broker).filter(Broker.owner_email == current_user.email).first()
        if not broker:
            return []
        query = query.filter(MT5Account.broker_id == broker.id)

    accounts = query.order_by(MT5Account.created_at.desc()).all()
    brokers = {
        b.id: b
        for b in db.query(Broker).filter(Broker.id.in_({a.broker_id for a in accounts})).all()
    } if accounts else {}

    result = []
    for a in accounts:
        broker = brokers.get(a.broker_id)
        if not broker:
            continue
        result.append(
            AdminMT5Account(
                id=a.id,
                user_email=a.user_email,
                broker_id=broker.id,
                broker_name=broker.name,
                mt5_number=a.mt5_number,
                account_type=a.account_type,
                metaapi_connection_status=a.metaapi_connection_status,
                metaapi_last_synced_at=a.metaapi_last_synced_at,
                created_at=a.created_at,
            )
        )
    return result
