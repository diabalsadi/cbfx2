from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend_shared.database import get_db
from backend_shared.models.user import User
from backend_shared.services import stripe_client
from backend_shared.services.copyfactory_sync import stop_lapsed_subscriptions
from backend_shared.utils.auth import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])


class CheckoutRequest(BaseModel):
    # Built client-side from window.location.origin so this endpoint never
    # has to know the frontend's deployment URL across dev/staging/prod.
    return_url: str


class CheckoutResponse(BaseModel):
    client_secret: str


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    payload: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Starts (or resumes, via the reused Stripe customer) a subscription
    checkout for the combined Signals + Copy Trading paywall — the returned
    client_secret is mounted inline via Stripe.js embedded checkout
    (frontend/components/ProGate), not a redirect URL."""
    if not stripe_client.configured():
        raise HTTPException(status_code=503, detail="Billing is not configured")
    client_secret = stripe_client.create_checkout_session(db, current_user, payload.return_url)
    return {"client_secret": client_secret}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Called by Stripe, not a signed-in user — authenticated via signature
    verification against the raw body instead of a JWT."""
    if not stripe_client.configured():
        raise HTTPException(status_code=503, detail="Billing is not configured")

    sig_header = request.headers.get("stripe-signature")
    payload = await request.body()
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    try:
        event = stripe_client.construct_webhook_event(payload, sig_header)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    affected_email = stripe_client.handle_webhook_event(db, event)
    if affected_email:
        # If this event dropped the user out of active/trialing, stop any
        # copy trading they have running immediately rather than waiting for
        # the next daily /internal/sync-subscriptions sweep.
        await stop_lapsed_subscriptions(db, user_email=affected_email)
    return {"received": True}
