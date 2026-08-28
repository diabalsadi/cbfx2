from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.seo_meta import SeoMeta, SeoSettings
from app.schemas.seo_meta import (
    SEO_ROUTES,
    SUB_KEY_ROUTES,
    TWITTER_CARDS,
    SeoMetaUpsert,
    SeoMeta as SeoMetaSchema,
    SeoSettingsUpsert,
    SeoSettings as SeoSettingsSchema,
)
from app.utils.auth import get_current_user
from app.utils.cache import purge_public_cache
from app.models.user import User

router = APIRouter(prefix="/seo", tags=["seo"])

ALLOWED_ROLES = {"super_admin", "editor"}
SETTINGS_ID = "global"


def require_roles(roles: set):
    def checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return checker


@router.get("/", response_model=List[SeoMetaSchema])
def list_seo_meta(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    return db.query(SeoMeta).order_by(SeoMeta.route, SeoMeta.sub_key).all()


@router.get("/routes")
def list_seo_routes(current_user: User = Depends(require_roles(ALLOWED_ROLES))):
    """The full registry of route keys the admin UI's dropdown can target."""
    return sorted(SEO_ROUTES)


# Declared ahead of the /{route} catch-all so "settings" is never mistaken
# for a route key.
@router.get("/settings", response_model=SeoSettingsSchema)
def get_seo_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    settings = db.query(SeoSettings).filter(SeoSettings.id == SETTINGS_ID).first()
    if not settings:
        settings = SeoSettings(id=SETTINGS_ID)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/settings", response_model=SeoSettingsSchema)
def set_seo_settings(
    payload: SeoSettingsUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    settings = db.query(SeoSettings).filter(SeoSettings.id == SETTINGS_ID).first()
    if not settings:
        settings = SeoSettings(id=SETTINGS_ID)
        db.add(settings)
    for field, value in payload.model_dump().items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    purge_public_cache()
    return settings


@router.put("/{route}", response_model=SeoMetaSchema)
def set_seo_meta(
    route: str,
    payload: SeoMetaUpsert,
    sub_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    if route not in SEO_ROUTES:
        raise HTTPException(status_code=400, detail=f"Invalid route. Must be one of: {', '.join(sorted(SEO_ROUTES))}")
    sub_key = (sub_key or "").strip()
    if sub_key and route not in SUB_KEY_ROUTES:
        raise HTTPException(status_code=400, detail=f"Route '{route}' does not support per-item overrides")
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if not payload.description.strip():
        raise HTTPException(status_code=400, detail="Description is required")
    if payload.twitter_card not in TWITTER_CARDS:
        raise HTTPException(status_code=400, detail=f"Invalid twitter_card. Must be one of: {', '.join(sorted(TWITTER_CARDS))}")

    seo = db.query(SeoMeta).filter(SeoMeta.route == route, SeoMeta.sub_key == sub_key).first()
    if seo:
        for field, value in payload.model_dump().items():
            setattr(seo, field, value)
    else:
        seo = SeoMeta(route=route, sub_key=sub_key, **payload.model_dump())
        db.add(seo)
    db.commit()
    db.refresh(seo)
    purge_public_cache()
    return seo


@router.delete("/{route}", status_code=status.HTTP_204_NO_CONTENT)
def clear_seo_meta(
    route: str,
    sub_key: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    """Remove a per-item override (e.g. one symbol's markets_symbol entry) so
    it falls back to the route's generic template. Idempotent."""
    sub_key = (sub_key or "").strip()
    if not sub_key:
        raise HTTPException(status_code=400, detail="Only per-item overrides (sub_key) can be cleared")
    seo = db.query(SeoMeta).filter(SeoMeta.route == route, SeoMeta.sub_key == sub_key).first()
    if seo:
        db.delete(seo)
        db.commit()
        purge_public_cache()
