from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    email = Column(String, primary_key=True, index=True, unique=True)
    name = Column(String)
    role = Column(String, default="user")
    hashed_password = Column(String)
    # Best-effort IP-based geolocation, one of app.schemas.broker.REGIONS; used to
    # match the user to brokers whose geo_coverage includes their region.
    region = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
