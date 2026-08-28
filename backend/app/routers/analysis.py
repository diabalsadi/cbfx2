from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.analysis import Analysis as AnalysisModel
from app.schemas.analysis import Analysis, AnalysisCreate, AnalysisUpdate
from app.utils.auth import get_current_user
from app.utils.cache import purge_public_cache
from app.utils.geo import detect_region, extract_client_ip
from app.utils.translate import detect_locale, translate_fields
from app.models.user import User

router = APIRouter(prefix="/analysis", tags=["analysis"])

ALLOWED_ROLES = {"super_admin", "editor"}


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


@router.get("", response_model=List[Analysis])
def list_analysis(request: Request, db: Session = Depends(get_db)):
    """Public — returns latest analysis entries, newest first,
    machine-translated into the visitor's detected locale."""
    country_code, region = detect_region(extract_client_ip(request))
    locale = detect_locale(request, country_code)
    entries = (
        db.query(AnalysisModel)
        .order_by(AnalysisModel.updated_at.desc())
        .all()
    )
    return [translate_fields(db, Analysis.model_validate(e).model_dump(), ["summary"], locale) for e in entries]


@router.get("/{analysis_id}", response_model=Analysis)
def get_analysis(analysis_id: str, request: Request, db: Session = Depends(get_db)):
    """Public — single analysis entry, machine-translated into the visitor's
    detected locale."""
    country_code, region = detect_region(extract_client_ip(request))
    locale = detect_locale(request, country_code)
    entry = db.query(AnalysisModel).filter(AnalysisModel.id == analysis_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return translate_fields(db, Analysis.model_validate(entry).model_dump(), ["summary"], locale)


@router.post("", response_model=Analysis, status_code=status.HTTP_201_CREATED)
def create_analysis(
    data: AnalysisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Admin-only — create an analysis entry."""
    entry = AnalysisModel(**data.model_dump(), author_email=current_user.email)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    purge_public_cache()
    return entry


@router.put("/{analysis_id}", response_model=Analysis)
def update_analysis(
    analysis_id: str,
    data: AnalysisUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Admin-only — update an analysis entry."""
    entry = db.query(AnalysisModel).filter(AnalysisModel.id == analysis_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Analysis not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    purge_public_cache()
    return entry


@router.delete("/{analysis_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Admin-only — delete an analysis entry."""
    entry = db.query(AnalysisModel).filter(AnalysisModel.id == analysis_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Analysis not found")
    db.delete(entry)
    db.commit()
    purge_public_cache()
