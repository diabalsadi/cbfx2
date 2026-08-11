from sqlalchemy import Column, String, Float, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Broker(Base):
    __tablename__ = "brokers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    img_src = Column(String, nullable=True)
    # JSON list of region codes, e.g. ["north_america", "europe"]
    geo_coverage = Column(JSON, nullable=False, default=list)
    cashback_rate = Column(Float, nullable=False, default=0.0)  # percentage points, e.g. 82.5 (%)
    # Our affiliate/referral identifier with this broker, used to attribute users who sign up through us
    referral_id = Column(String, nullable=True)
    status = Column(String, default="active")  # active, inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
