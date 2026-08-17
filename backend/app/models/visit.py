from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Visit(Base):
    """One page-load ping, logged from GET /geo/detect (fired on every app
    mount, site-wide). Excludes admin-portal staff so their own dashboard
    checks don't inflate visitor counts."""

    __tablename__ = "visits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    country_code = Column(String, nullable=True)
    region = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
