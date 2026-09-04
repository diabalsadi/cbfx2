from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend_shared.database import get_db
from backend_shared.models.article import Article
from backend_shared.schemas.article import ArticleCreate, ArticleUpdate, Article as ArticleSchema
from backend_shared.utils.auth import get_current_user
from backend_shared.utils.cache import purge_public_cache
from backend_shared.models.user import User
from backend_shared.auth.rbac import require_roles

router = APIRouter(prefix="/articles", tags=["articles"])

ALLOWED_ROLES = {"super_admin", "editor"}

@router.get("/", response_model=List[ArticleSchema])
def list_articles(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    return db.query(Article).order_by(Article.created_at.desc()).all()


@router.get("/{article_id}", response_model=ArticleSchema)
def get_article(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.post("/", response_model=ArticleSchema, status_code=status.HTTP_201_CREATED)
def create_article(
    payload: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    if payload.article_type == "analysis" and (not payload.market_category or not payload.symbol):
        raise HTTPException(status_code=422, detail="Analysis articles require a market category and symbol")
    article = Article(**payload.model_dump(), author_email=current_user.email)
    db.add(article)
    db.commit()
    db.refresh(article)
    purge_public_cache()
    return article


@router.put("/{article_id}", response_model=ArticleSchema)
def update_article(
    article_id: str,
    payload: ArticleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALLOWED_ROLES)),
):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    # Editors can only edit their own articles unless super_admin
    if current_user.role == "editor" and article.author_email != current_user.email:
        raise HTTPException(status_code=403, detail="Can only edit your own articles")

    updates = payload.model_dump(exclude_unset=True)
    next_type = updates.get("article_type", article.article_type)
    next_category = updates.get("market_category", article.market_category)
    next_symbol = updates.get("symbol", article.symbol)
    if next_type == "analysis" and (not next_category or not next_symbol):
        raise HTTPException(status_code=422, detail="Analysis articles require a market category and symbol")

    for field, value in updates.items():
        setattr(article, field, value)
    db.commit()
    db.refresh(article)
    purge_public_cache()
    return article


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles({"super_admin"})),
):
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    db.delete(article)
    db.commit()
    purge_public_cache()
