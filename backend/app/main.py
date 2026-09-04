import os
from fastapi import FastAPI
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from backend_shared.database import engine, Base
from backend_shared.migrations import run_startup_migrations
from app.routers import auth
from app.routers import articles, clients, campaigns, users, public
from app.routers import market_prices, copy_traders, plays, analysis, forum
from app.routers import (
    brokers,
    geo,
    broker_placements,
    ad_banners,
    mt5_accounts,
    seo_meta,
)
from app.routers import (
    referrals,
    visits,
    notifications,
    media,
    broker_reports,
    symbol_categories,
    internal,
    rebate_payouts,
    billing,
)
from app.routers import copy_subscriptions, withdrawal_requests

# Import all models so SQLAlchemy creates their tables
import backend_shared.models.user
import backend_shared.models.pending_registration
import backend_shared.models.password_reset
import backend_shared.models.article
import backend_shared.models.client
import backend_shared.models.campaign
import backend_shared.models.market_price
import backend_shared.models.copy_trader
import backend_shared.models.play
import backend_shared.models.analysis
import backend_shared.models.forum_thread
import backend_shared.models.forum_reply
import backend_shared.models.broker
import backend_shared.models.broker_rating
import backend_shared.models.broker_placement
import backend_shared.models.ad_banner
import backend_shared.models.mt5_account
import backend_shared.models.wallet_transaction
import backend_shared.models.broker_report
import backend_shared.models.seo_meta
import backend_shared.models.visit
import backend_shared.models.notification
import backend_shared.models.translation
import backend_shared.models.symbol_category
import backend_shared.models.trade_record
import backend_shared.models.rebate_payout
import backend_shared.models.copy_subscription
import backend_shared.models.withdrawal_request

Base.metadata.create_all(bind=engine)

run_startup_migrations(engine)

app = FastAPI(title="CBFX API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(clients.router)
app.include_router(campaigns.router)
app.include_router(users.router)
app.include_router(public.router)
app.include_router(market_prices.router)
app.include_router(copy_traders.router)
app.include_router(plays.router)
app.include_router(analysis.router)
app.include_router(forum.router)
app.include_router(brokers.router)
app.include_router(geo.router)
app.include_router(broker_placements.router)
app.include_router(ad_banners.router)
app.include_router(mt5_accounts.router)
app.include_router(seo_meta.router)
app.include_router(referrals.router)
app.include_router(visits.router)
app.include_router(notifications.router)
app.include_router(media.router)
app.include_router(broker_reports.router)
app.include_router(symbol_categories.router)
app.include_router(internal.router)
app.include_router(rebate_payouts.router)
app.include_router(billing.router)
app.include_router(copy_subscriptions.router)
app.include_router(withdrawal_requests.router)


@app.get("/")
async def read_root():
    return {"message": "CBFX API v1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
