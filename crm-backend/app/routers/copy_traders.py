import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend_shared.database import get_db
from backend_shared.models.broker import Broker
from backend_shared.models.copy_trader import CopyTrader as CopyTraderModel
from backend_shared.schemas.copy_trader import CopyTrader, CopyTraderCreate, CopyTraderUpdate, CopyTraderConnectLive
from backend_shared.utils.auth import get_current_user
from backend_shared.utils.cache import purge_public_cache
from backend_shared.utils.encryption import encrypt_field
from backend_shared.models.user import User
from backend_shared.services import metaapi_client, copyfactory_client
from backend_shared.auth.rbac import require_roles

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/copy-traders", tags=["copy-traders"])

ALLOWED_ROLES = {"super_admin", "editor"}

@router.get("", response_model=List[CopyTrader])
def list_copy_traders(
    strategy: Optional[str] = Query(None, description="Filter by strategy: Scalping, Swing, Position"),
    pair: Optional[str] = Query(None, description="Filter by traded pair, e.g. EUR/USD"),
    sort_by: str = Query("roi_12m", description="Sort field: roi_12m, roi_3m, roi_1m, followers, win_rate"),
    db: Session = Depends(get_db),
):
    """Public — returns active copy traders with optional filters and sorting."""
    q = db.query(CopyTraderModel).filter(CopyTraderModel.is_active == True)

    if strategy:
        q = q.filter(CopyTraderModel.strategy == strategy)

    traders = q.all()

    # Pair filter is post-processed (JSON column)
    if pair:
        traders = [t for t in traders if pair in (t.pairs or [])]

    # Sort
    sort_map = {
        "roi_12m": lambda t: t.roi_12m,
        "roi_3m": lambda t: t.roi_3m,
        "roi_1m": lambda t: t.roi_1m,
        "followers": lambda t: t.followers,
        "win_rate": lambda t: t.win_rate,
    }
    key_fn = sort_map.get(sort_by, lambda t: t.roi_12m)
    traders = sorted(traders, key=key_fn, reverse=True)

    return traders


@router.get("/{trader_id}", response_model=CopyTrader)
def get_copy_trader(trader_id: str, db: Session = Depends(get_db)):
    """Public — single trader detail."""
    trader = db.query(CopyTraderModel).filter(CopyTraderModel.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    return trader


@router.post("", response_model=CopyTrader, status_code=status.HTTP_201_CREATED)
def create_copy_trader(
    data: CopyTraderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Admin-only — create a copy trader profile."""
    trader = CopyTraderModel(**data.model_dump())
    db.add(trader)
    db.commit()
    db.refresh(trader)
    purge_public_cache()
    return trader


@router.put("/{trader_id}", response_model=CopyTrader)
def update_copy_trader(
    trader_id: str,
    data: CopyTraderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Admin-only — update a copy trader profile."""
    trader = db.query(CopyTraderModel).filter(CopyTraderModel.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(trader, field, value)
    db.commit()
    db.refresh(trader)
    purge_public_cache()
    return trader


@router.delete("/{trader_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_copy_trader(
    trader_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Admin-only — remove a copy trader profile."""
    trader = db.query(CopyTraderModel).filter(CopyTraderModel.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")
    db.delete(trader)
    db.commit()
    purge_public_cache()


@router.post("/{trader_id}/connect-live", response_model=CopyTrader)
async def connect_live_account(
    trader_id: str,
    payload: CopyTraderConnectLive,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Admin-only — links a curated trader's real MT5 account so their
    trades are actually mirrored via MetaApi CopyFactory instead of being
    curated stats. Only the trader's own read-only investor password is
    needed: CopyFactory only reads this account's trades to build the
    strategy feed, it never places trades on it (see copyfactory_client.py).

    Idempotent/retryable: if this trader already has a metaapi_account_id,
    reuses it (checks status, doesn't re-provision) rather than creating a
    duplicate MetaApi account on a retry — provisioning can take minutes to
    reach "connected", and MetaApi bills per registered account."""
    trader = db.query(CopyTraderModel).filter(CopyTraderModel.id == trader_id).first()
    if not trader:
        raise HTTPException(status_code=404, detail="Trader not found")

    platform = (payload.platform or "").strip().lower()
    if platform not in ("mt4", "mt5"):
        raise HTTPException(status_code=400, detail="Platform must be mt4 or mt5")

    broker = db.query(Broker).filter(Broker.id == payload.broker_id, Broker.status == "active").first()
    if not broker:
        raise HTTPException(status_code=400, detail="Invalid broker selected")

    if not metaapi_client.configured():
        raise HTTPException(status_code=503, detail="MetaApi is not configured")

    if not trader.metaapi_account_id:
        trader.broker_id = broker.id
        trader.mt5_number = payload.mt5_number.strip()
        trader.server = payload.server.strip()
        trader.platform = platform
        trader.investor_password_encrypted = encrypt_field(payload.investor_password)
        try:
            result = await metaapi_client.provision_account(
                login=trader.mt5_number,
                server=trader.server,
                platform=platform,
                investor_password=payload.investor_password,
                name=f"strategy · {trader.name} · {trader.mt5_number}",
            )
            trader.metaapi_account_id = result["metaapi_account_id"]
            trader.metaapi_connection_status = result["status"]
        except Exception:
            logger.exception("MetaApi provisioning failed for copy trader %s", trader.id)
            trader.metaapi_connection_status = "error"
    else:
        try:
            trader.metaapi_connection_status = await metaapi_client.check_account_status(trader.metaapi_account_id)
        except Exception:
            logger.exception("MetaApi status check failed for copy trader %s", trader.id)
            trader.metaapi_connection_status = "error"

    if trader.metaapi_connection_status == "connected" and not trader.copyfactory_strategy_id:
        try:
            trader.copyfactory_strategy_id = await copyfactory_client.create_strategy(
                trader.metaapi_account_id, trader.name
            )
            trader.is_live = True
        except Exception:
            logger.exception("CopyFactory strategy creation failed for copy trader %s", trader.id)

    db.commit()
    db.refresh(trader)
    purge_public_cache()
    return trader
