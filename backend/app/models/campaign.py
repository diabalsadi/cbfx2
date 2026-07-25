from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    client_id = Column(String, ForeignKey("clients.id"), nullable=True)
    budget = Column(Float, default=0.0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    spend = Column(Float, default=0.0)
    status = Column(String, default="draft")  # draft, active, paused, completed
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    image_url = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.email"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
