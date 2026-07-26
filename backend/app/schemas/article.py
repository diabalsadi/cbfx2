from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class ArticleBase(BaseModel):
    title: str
    content: Optional[str] = None
    excerpt: Optional[str] = None
    cover_image_url: Optional[str] = None
    article_type: Literal["news", "analysis"] = "news"
    market_category: Optional[Literal["crypto", "forex", "metals", "indices"]] = None
    symbol: Optional[str] = None
    is_published: Optional[bool] = False


class ArticleCreate(ArticleBase):
    pass


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    cover_image_url: Optional[str] = None
    article_type: Optional[Literal["news", "analysis"]] = None
    market_category: Optional[Literal["crypto", "forex", "metals", "indices"]] = None
    symbol: Optional[str] = None
    is_published: Optional[bool] = None


class Article(ArticleBase):
    id: str
    author_email: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
