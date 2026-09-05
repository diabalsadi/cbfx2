from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend_shared.database import get_db
from backend_shared.models.symbol_category import SymbolCategory as SymbolCategoryModel
from backend_shared.schemas.symbol_category import SymbolCategory, SymbolCategoryCreate, SymbolCategoryUpdate
from backend_shared.utils.auth import get_current_user
from backend_shared.models.user import User
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/symbol-categories", tags=["symbol-categories"])

# Admin-managed source of truth for rebate pricing's symbol -> category
# lookup (METAAPI_INTEGRATION_ARCHITECTURE.md §5/§11) — super_admin only,
# unlike editor-accessible content routers, since this drives rebate math.
ALLOWED_ROLES = {"super_admin"}

def _normalize(symbol: str) -> str:
    return symbol.strip().upper()


@router.get("", response_model=List[SymbolCategory])
def list_symbol_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    return db.query(SymbolCategoryModel).order_by(SymbolCategoryModel.symbol).all()


@router.post("", response_model=SymbolCategory, status_code=status.HTTP_201_CREATED)
def create_symbol_category(
    data: SymbolCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    symbol = _normalize(data.symbol)
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    existing = db.query(SymbolCategoryModel).filter(SymbolCategoryModel.symbol == symbol).first()
    if existing:
        raise HTTPException(status_code=400, detail="Symbol already has a category mapping")

    entry = SymbolCategoryModel(symbol=symbol, category=data.category.strip())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/{symbol_category_id}", response_model=SymbolCategory)
def update_symbol_category(
    symbol_category_id: str,
    data: SymbolCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    entry = db.query(SymbolCategoryModel).filter(SymbolCategoryModel.id == symbol_category_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Symbol category not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{symbol_category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_symbol_category(
    symbol_category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    entry = db.query(SymbolCategoryModel).filter(SymbolCategoryModel.id == symbol_category_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Symbol category not found")
    db.delete(entry)
    db.commit()
