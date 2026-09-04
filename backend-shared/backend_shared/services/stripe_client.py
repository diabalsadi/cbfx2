"""Stripe integration for the combined Signals + Copy Trading subscription.

One Stripe Product/Price (STRIPE_PRICE_ID) gates both pages — see
frontend/components/ProGate. Credentials/price id are read lazily on first
use, matching the R2/MetaApi pattern — a deployment without Stripe configured
doesn't fail to start, /billing/* just 503s until the env vars are set.

subscription_status on the User row always mirrors Stripe's own subscription
status verbatim (active/trialing/past_due/canceled/unpaid/...) — set only by
handle_webhook_event, never by the checkout redirect itself, since the
redirect happens before Stripe has necessarily finished provisioning the
subscription. "active" or "trialing" is what unlocks the gated pages.
"""
import logging
import os
from typing import Optional

from sqlalchemy.orm import Session
from stripe import StripeClient
from stripe._event import Event

from backend_shared.models.user import User

logger = logging.getLogger(__name__)

_client: Optional[StripeClient] = None


def _get_client() -> StripeClient:
    global _client
    if _client is None:
        api_key = os.environ["STRIPE_SECRET_KEY"]
        _client = StripeClient(api_key)
    return _client


def configured() -> bool:
    return bool(os.environ.get("STRIPE_SECRET_KEY") and os.environ.get("STRIPE_PRICE_ID"))


def _get_or_create_customer_id(db: Session, user: User) -> str:
    if user.stripe_customer_id:
        return user.stripe_customer_id

    sc = _get_client()
    customer = sc.v1.customers.create({"email": user.email, "metadata": {"user_email": user.email}})
    user.stripe_customer_id = customer.id
    db.commit()
    return customer.id


def create_checkout_session(db: Session, user: User, return_url: str) -> str:
    """Returns a Checkout Session client_secret for Stripe.js's embedded
    checkout (ui_mode="embedded_page") — rendered inline on our own page via
    frontend/components/ProGate, rather than redirecting out to
    checkout.stripe.com. return_url is where Stripe sends the customer back
    after they complete or cancel payment on their bank/card issuer's site
    (3D Secure etc.) — not a plain success/cancel pair like hosted mode."""
    sc = _get_client()
    price_id = os.environ["STRIPE_PRICE_ID"]
    customer_id = _get_or_create_customer_id(db, user)

    session = sc.v1.checkout.sessions.create(
        {
            "mode": "subscription",
            "ui_mode": "embedded_page",
            # Deliberately no payment_method_types — let Stripe pick eligible
            # methods dynamically from the Dashboard config.
            "customer": customer_id,
            "line_items": [{"price": price_id, "quantity": 1}],
            "return_url": return_url,
            "client_reference_id": user.email,
        }
    )
    return session.client_secret


def construct_webhook_event(payload: bytes, sig_header: str) -> Event:
    """Raises stripe.SignatureVerificationError if the signature doesn't
    match — callers must reject the request (400) when that happens, never
    process an unverified payload."""
    sc = _get_client()
    webhook_secret = os.environ["STRIPE_WEBHOOK_SECRET"]
    return sc.construct_event(payload, sig_header, webhook_secret)


def handle_webhook_event(db: Session, event: Event) -> Optional[str]:
    """Applies a verified Stripe event to the matching User row. Unknown/
    irrelevant event types are ignored, not errors — Stripe sends many event
    types we don't act on.

    Returns the affected user's email when their subscription_status may
    have changed, else None — routers/billing.py uses this to scope
    copyfactory_sync.stop_lapsed_subscriptions() to just that user right
    away, instead of waiting for the next daily reconciliation sweep."""
    obj = event["data"]["object"]

    if event["type"] == "checkout.session.completed":
        customer_id = obj["customer"]
        subscription_id = obj["subscription"]
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user and subscription_id:
            user.stripe_subscription_id = subscription_id
            db.commit()
        return None

    if event["type"] in ("customer.subscription.updated", "customer.subscription.created"):
        customer_id = obj["customer"]
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.stripe_subscription_id = obj["id"]
            user.subscription_status = obj["status"]
            db.commit()
            return user.email
        return None

    if event["type"] == "customer.subscription.deleted":
        customer_id = obj["customer"]
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.subscription_status = "canceled"
            db.commit()
            return user.email
        return None

    logger.info("Unhandled Stripe webhook event type: %s", event["type"])
    return None


def _pick_relevant_subscription(subscriptions: list):
    """Prefers an active/trialing subscription over a lapsed one, then falls
    back to the most recently created — covers the (rare but real) case of
    more than one subscription existing for the same customer."""
    for sub in subscriptions:
        if sub.status in ("active", "trialing"):
            return sub
    return max(subscriptions, key=lambda s: s.created) if subscriptions else None


def sync_subscription_statuses(db: Session) -> dict:
    """Daily reconciliation safety net (called from
    POST /internal/sync-subscriptions) — re-fetches status directly from
    Stripe and corrects it here in case a webhook was ever missed or arrived
    out of order. The webhook handler above is still the primary, near-
    real-time mechanism; this guarantees no user silently stays "active"
    past the end of a day their payment failed, *and* catches a checkout
    whose "checkout.session.completed" event itself never arrived — those
    users have a stripe_customer_id but never got stripe_subscription_id
    linked at all, so they need discovering via the customer, not just a
    status refresh on an id we already have."""
    sc = _get_client()
    checked = 0
    updated = 0

    linked_users = db.query(User).filter(User.stripe_subscription_id.isnot(None)).all()
    for user in linked_users:
        checked += 1
        try:
            subscription = sc.v1.subscriptions.retrieve(user.stripe_subscription_id)
        except Exception:
            logger.exception("Failed to retrieve Stripe subscription for %s", user.email)
            continue
        if user.subscription_status != subscription.status:
            user.subscription_status = subscription.status
            updated += 1

    unlinked_users = (
        db.query(User)
        .filter(User.stripe_customer_id.isnot(None), User.stripe_subscription_id.is_(None))
        .all()
    )
    for user in unlinked_users:
        checked += 1
        try:
            subs = sc.v1.subscriptions.list({"customer": user.stripe_customer_id}).data
        except Exception:
            logger.exception("Failed to list Stripe subscriptions for %s", user.email)
            continue
        subscription = _pick_relevant_subscription(subs)
        if subscription:
            user.stripe_subscription_id = subscription.id
            user.subscription_status = subscription.status
            updated += 1

    db.commit()
    return {"checked": checked, "updated": updated}
