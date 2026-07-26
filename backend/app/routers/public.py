from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.article import Article
from app.models.client import Client
from app.schemas.article import Article as ArticleSchema

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/articles", response_model=List[ArticleSchema])
def list_published_articles(db: Session = Depends(get_db)):
    """Public endpoint — returns only published articles."""
    return (
        db.query(Article)
        .filter(Article.is_published == True)
        .order_by(Article.created_at.desc())
        .all()
    )


@router.get("/brokers")
def list_brokers(db: Session = Depends(get_db)):
    """Public endpoint — returns active broker/client list."""
    clients = (
        db.query(Client)
        .filter(Client.status == "active")
        .order_by(Client.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "company": c.company,
            "status": c.status,
        }
        for c in clients
    ]
