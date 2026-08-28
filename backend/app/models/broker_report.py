from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base
import uuid


class BrokerReport(Base):
    """A trading-activity report file an admin/broker uploaded for one broker
    (e.g. a lots-traded export), stored in R2 under that broker's id. This
    row is just the catalog entry — nothing parses or credits cashback from
    the file yet; see CASHBACK_WORKFLOW_GAP_ANALYSIS.md item 3.3 for that."""

    __tablename__ = "broker_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    broker_id = Column(String, ForeignKey("brokers.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)  # original filename, shown to admins
    r2_key = Column(String, nullable=False)  # object key within the bucket
    size = Column(Integer, nullable=False)
    uploaded_by = Column(String, ForeignKey("users.email"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
