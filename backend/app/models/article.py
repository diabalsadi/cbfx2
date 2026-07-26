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
    is_published = Column(Boolean, default=False)
    author_email = Column(String, ForeignKey("users.email"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
