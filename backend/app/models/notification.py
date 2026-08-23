from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_email = Column(String, ForeignKey("users.email"), nullable=False, index=True)
    # e.g. "campaign_pending_review" — lets the frontend decide an icon/link
    # without parsing title/body.
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(String, nullable=True)
    # What this notification is about, e.g. related_type="campaign",
    # related_id=<campaign.id> — lets the client link straight to it.
    related_type = Column(String, nullable=True)
    related_id = Column(String, nullable=True)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
