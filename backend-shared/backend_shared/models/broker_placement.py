from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from backend_shared.database import Base
import uuid


class BrokerPlacement(Base):
    __tablename__ = "broker_placements"
    __table_args__ = (
        UniqueConstraint(
            "section", "region", "position", name="uq_broker_placement_section_region_position"
        ),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Homepage section key: "featured"
    section = Column(String, nullable=False)
    # Coverage scope this ordering applies to: "default" (fallback order, used
    # whenever a visitor's detected region has no override for this section) or
    # one of the broker geo_coverage region codes (e.g. "europe"), letting admins
    # order the same section differently per region.
    region = Column(String, nullable=False, default="default")
    position = Column(Integer, nullable=False)  # 1-indexed slot number within the section+region
    broker_id = Column(String, ForeignKey("brokers.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
