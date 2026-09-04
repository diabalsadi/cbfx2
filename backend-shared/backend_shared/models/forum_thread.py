from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from backend_shared.database import Base
import uuid


class ForumThread(Base):
    __tablename__ = "forum_threads"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    # "General" | "Forex" | "Crypto" | "Metals" | "Indices" | "Strategy"
    category = Column(String, nullable=False, default="General")
    author_email = Column(String, ForeignKey("users.email"), nullable=False, index=True)
    reply_count = Column(Integer, nullable=False, default=0)
    image_url = Column(String, nullable=True)
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
