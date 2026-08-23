from sqlalchemy import Column, String, DateTime, ForeignKey
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
    # ISO country code from the same IP lookup; used to match brokers whose
    # coverage_type is "country".
    country_code = Column(String, nullable=True)
    # Shareable code assigned by an admin to role="client" users so signups
    # can be attributed to them via /auth/register's referral_code field.
    referral_code = Column(String, unique=True, nullable=True, index=True)
    # Email of the client user this account signed up under, resolved from
    # referral_code at registration time.
    referred_by = Column(String, ForeignKey("users.email"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
