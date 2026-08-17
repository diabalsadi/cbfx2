from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Visit(Base):
    """One de-duplicated visitor-day, logged from GET /geo/detect (fired on
    every app mount, site-wide). Excludes admin-portal staff so their own
    dashboard checks don't inflate visitor counts. `visitor_key` is
    "user:{email}" for signed-in accounts or "anon:{id}" for an anonymous
    browser id (see frontend/helpers/visitorId.ts) — at most one row per
    visitor_key per calendar day, so refreshing the page doesn't count as a
    new visitor."""

    __tablename__ = "visits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    country_code = Column(String, nullable=True)
    region = Column(String, nullable=True)
    visitor_key = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
