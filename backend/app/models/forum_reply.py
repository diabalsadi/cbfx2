from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import uuid


class ForumReply(Base):
    __tablename__ = "forum_replies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    thread_id = Column(String, ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False)
    body = Column(Text, nullable=False)
    author_email = Column(String, ForeignKey("users.email"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
