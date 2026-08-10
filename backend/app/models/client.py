from sqlalchemy import Column, String, DateTime, Float
from sqlalchemy.sql import func
from app.database import Base
import uuid


class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = Column(String, nullable=False)
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True, unique=True)
    phone = Column(String, nullable=True)
    monthly_budget = Column(Float, nullable=True)
    status = Column(String, default="active")  # active, inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
