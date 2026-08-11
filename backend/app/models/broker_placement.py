from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base
import uuid


class BrokerPlacement(Base):
    __tablename__ = "broker_placements"
    __table_args__ = (
        UniqueConstraint("section", "position", name="uq_broker_placement_section_position"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Homepage section key: "featured" | "sponsored" | "partners" | "more_partners"
    section = Column(String, nullable=False)
    position = Column(Integer, nullable=False)  # 1-indexed slot number within the section
    broker_id = Column(String, ForeignKey("brokers.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
