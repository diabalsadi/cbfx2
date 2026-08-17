import os
from fastapi import FastAPI
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth
from app.routers import articles, clients, campaigns, users, public
from app.routers import market_prices, copy_traders, plays, analysis, forum
from app.routers import brokers, geo, broker_placements, ad_banners, mt5_accounts, seo_meta
from app.routers import referrals, visits

# Import all models so SQLAlchemy creates their tables
import app.models.user
import app.models.article
import app.models.client
import app.models.campaign
import app.models.market_price
import app.models.copy_trader
import app.models.play
import app.models.analysis
import app.models.forum_thread
import app.models.forum_reply
import app.models.broker
import app.models.broker_placement
import app.models.ad_banner
import app.models.mt5_account
import app.models.wallet_transaction
import app.models.seo_meta
import app.models.visit

Base.metadata.create_all(bind=engine)

# This project currently has no migration runner. Keep existing development
# databases compatible when new editorial metadata is introduced.
with engine.begin() as connection:
    connection.execute(text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS market_category VARCHAR"))
    connection.execute(text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS symbol VARCHAR"))
    connection.execute(text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_title VARCHAR"))
    connection.execute(text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_description VARCHAR"))
    connection.execute(text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS og_image VARCHAR"))
    connection.execute(text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_keywords VARCHAR"))
    connection.execute(text("ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS image_url VARCHAR"))
    connection.execute(text("ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS image_url VARCHAR"))
    connection.execute(text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS referral_id VARCHAR"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS region VARCHAR"))
    connection.execute(text("ALTER TABLE brokers ADD COLUMN IF NOT EXISTS coverage_type VARCHAR DEFAULT 'region'"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR"))
    connection.execute(text("ALTER TABLE broker_placements ADD COLUMN IF NOT EXISTS region VARCHAR DEFAULT 'default'"))
    connection.execute(text("UPDATE broker_placements SET region = 'default' WHERE region IS NULL"))
    connection.execute(text(
        "ALTER TABLE broker_placements DROP CONSTRAINT IF EXISTS uq_broker_placement_section_position"
    ))
    # Postgres has no ADD CONSTRAINT IF NOT EXISTS, and this block re-runs on
    # every startup, so guard it explicitly to stay idempotent.
    connection.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_broker_placement_section_region_position'
            ) THEN
                ALTER TABLE broker_placements
                    ADD CONSTRAINT uq_broker_placement_section_region_position UNIQUE (section, region, position);
            END IF;
        END $$;
        """
    ))
    connection.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS region VARCHAR DEFAULT 'default'"))
    connection.execute(text("UPDATE ad_banners SET region = 'default' WHERE region IS NULL"))
    connection.execute(text(
        "ALTER TABLE ad_banners DROP CONSTRAINT IF EXISTS uq_ad_banner_page_slot"
    ))
    connection.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_ad_banner_page_slot_region'
            ) THEN
                ALTER TABLE ad_banners
                    ADD CONSTRAINT uq_ad_banner_page_slot_region UNIQUE (page, slot, region);
            END IF;
        END $$;
        """
    ))
    connection.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS features JSON DEFAULT '[]'::json"))
    connection.execute(text("ALTER TABLE ad_banners ADD COLUMN IF NOT EXISTS disclaimer VARCHAR"))
    connection.execute(text("ALTER TABLE seo_meta ADD COLUMN IF NOT EXISTS sub_key VARCHAR DEFAULT ''"))
    connection.execute(text("UPDATE seo_meta SET sub_key = '' WHERE sub_key IS NULL"))
    connection.execute(text("ALTER TABLE seo_meta DROP CONSTRAINT IF EXISTS seo_meta_route_key"))
    connection.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_seo_meta_route_sub_key'
            ) THEN
                ALTER TABLE seo_meta
                    ADD CONSTRAINT uq_seo_meta_route_sub_key UNIQUE (route, sub_key);
            END IF;
        END $$;
        """
    ))
    connection.execute(text("ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS default_keywords VARCHAR"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR"))
    connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR"))
    connection.execute(text(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_referral_code'
            ) THEN
                ALTER TABLE users ADD CONSTRAINT uq_users_referral_code UNIQUE (referral_code);
            END IF;
        END $$;
        """
    ))
    connection.execute(text("ALTER TABLE visits ADD COLUMN IF NOT EXISTS visitor_key VARCHAR"))

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


@app.get("/")
async def read_root():
    return {"message": "CBFX API v1.0.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}
