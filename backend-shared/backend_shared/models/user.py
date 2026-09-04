from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from backend_shared.database import Base


class User(Base):
    __tablename__ = "users"

    email = Column(String, primary_key=True, index=True, unique=True)
    name = Column(String)
    role = Column(String, default="user")
    hashed_password = Column(String)
    # Best-effort IP-based geolocation, one of backend_shared.schemas.broker.REGIONS; used to
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
    # Set when a super_admin regenerates this account's password (see
    # POST /users/{email}/regenerate-password) — forces the admin/layout.tsx
    # gate to route the next login to /admin/change-password before anything
    # else, instead of trusting the emailed temp password indefinitely.
    must_change_password = Column(Boolean, nullable=False, default=False)
    # Combined Signals + Copy Trading subscription (Stripe). stripe_customer_id
    # is set on first checkout attempt; stripe_subscription_id/status are set
    # by the /billing/webhook handler from Stripe's own subscription events —
    # never trust the Checkout redirect alone, the webhook is the source of
    # truth. subscription_status stores Stripe's own vocabulary verbatim
    # (active/trialing/past_due/canceled/...) — see app/services/stripe_client.py.
    stripe_customer_id = Column(String, nullable=True, index=True)
    stripe_subscription_id = Column(String, nullable=True)
    subscription_status = Column(String, nullable=False, default="inactive")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
