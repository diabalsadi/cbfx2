from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Article(Base):
    __tablename__ = "articles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    content = Column(Text, nullable=True)
    excerpt = Column(String, nullable=True)
    cover_image_url = Column(String, nullable=True)
    article_type = Column(String, nullable=False, default="news")  # "news" | "analysis"
    market_category = Column(String, nullable=True)  # crypto | forex | metals | indices
    symbol = Column(String, nullable=True)  # Required for analysis articles
    is_published = Column(Boolean, default=False)
    # Optional per-article SEO overrides. When set, these take priority over
    # the generic news_detail/analysis_detail SEO template for this article's
    # own page (see app.routers.public.get_seo_meta and the frontend's
    # [id]/page.tsx generateMetadata()).
    meta_title = Column(String, nullable=True)
    meta_description = Column(String, nullable=True)
    meta_keywords = Column(String, nullable=True)
    og_image = Column(String, nullable=True)
    author_email = Column(String, ForeignKey("users.email"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
