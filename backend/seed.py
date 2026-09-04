import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend_shared.database import SessionLocal, engine, Base
from backend_shared.models.user import User
from backend_shared.models.seo_meta import SeoMeta
import bcrypt


# ── Users ──────────────────────────────────────────────────────────────────────


def seed_users(db):
    test_users = [
        {
            "email": "admin@cbfx.com",
            "name": "Super Admin",
            "role": "super_admin",
            "password": "password123",
        }
    ]
    for tu in test_users:
        if not db.query(User).filter(User.email == tu["email"]).first():
            hashed = bcrypt.hashpw(
                tu["password"].encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")
            db.add(
                User(
                    email=tu["email"],
                    name=tu["name"],
                    role=tu["role"],
                    hashed_password=hashed,
                )
            )
            print(f"  + User: {tu['email']}")
        else:
            print(f"  . User exists: {tu['email']}")


# ── SEO Meta ───────────────────────────────────────────────────────────────────


def seed_seo_meta(db):
    # Dynamic-route entries ("_detail"/"_symbol") are templates — {token}
    # placeholders get filled in with real page data at render time.
    entries = [
        {
            "route": "homepage",
            "title": "CBFX — Trade Smarter. Earn Cashback on Every Pip.",
            "description": "Cashback, copy trading, premium trading signals and a live community — all in one cockpit. Join CBFX free.",
            "keywords": "forex cashback, copy trading, trading signals, forex rebates",
            "canonical_path": "/",
        },
        {
            "route": "login",
            "title": "Sign In | CBFX",
            "description": "Sign in to your CBFX account to track your cashback, copy trades and manage your MT5 accounts.",
            "canonical_path": "/login",
        },
        {
            "route": "register",
            "title": "Create Your Free CBFX Account",
            "description": "Sign up free and start earning cashback on every trade. Link your MT5 account and get rebates from top forex brokers.",
            "canonical_path": "/register",
        },
        {
            "route": "account",
            "title": "My Account | CBFX",
            "description": "Manage your CBFX profile, password and account settings.",
            "canonical_path": "/account",
            "robots": "noindex, nofollow",
        },
        {
            "route": "analysis",
            "title": "Forex, Crypto & Metals Technical Analysis | CBFX",
            "description": "Daily technical analysis and market bias across forex, crypto and metals pairs from the CBFX trading desk.",
            "canonical_path": "/analysis",
        },
        {
            "route": "analysis_detail",
            "title": "{title} | CBFX Analysis",
            "description": "{title} — in-depth technical analysis from the CBFX trading desk.",
        },
        {
            "route": "brokers",
            "title": "Best Forex Cashback Brokers — Compare Rebates | CBFX",
            "description": "Compare vetted forex brokers by cashback rate and coverage. Get the highest rebates on every trade with CBFX.",
            "canonical_path": "/brokers",
        },
        {
            "route": "calendar",
            "title": "Live Economic Calendar | CBFX",
            "description": "Track upcoming macro events, central bank decisions and economic releases in real time on CBFX's live calendar.",
            "canonical_path": "/calendar",
        },
        {
            "route": "cashback",
            "title": "Forex Cashback — Track Your Rebates | CBFX",
            "description": "See your cashback balance across every linked MT5 account and track money in and money out, all in one place.",
            "canonical_path": "/cashback",
        },
        {
            "route": "copy_trading",
            "title": "Copy Trading — Follow Top Traders | CBFX",
            "description": "Copy the trades of vetted, top-performing traders automatically. Compare ROI, win rate and strategy on CBFX.",
            "canonical_path": "/copy-trading",
        },
        {
            "route": "forum",
            "title": "Trading Forum & Community | CBFX",
            "description": "Join the CBFX trading community — share setups, ask questions and discuss the markets with fellow traders.",
            "canonical_path": "/forum",
        },
        {
            "route": "forum_detail",
            "title": "{title} | CBFX Forum",
            "description": "Join the discussion: {title} — trading ideas and community insights on CBFX.",
        },
        {
            "route": "markets",
            "title": "Live Market Prices — Forex, Crypto & Metals | CBFX",
            "description": "Real-time prices and charts across forex, crypto and metals. Track the markets that matter on CBFX.",
            "canonical_path": "/markets",
        },
        {
            "route": "markets_symbol",
            "title": "{symbol} Price, Chart & Live Analysis | CBFX",
            "description": "Live {symbol} price, real-time chart, technical analysis and news — track it free on CBFX.",
        },
        {
            "route": "news",
            "title": "Forex & Crypto News | CBFX",
            "description": "Breaking forex, crypto and metals news, updated throughout the trading day.",
            "canonical_path": "/news",
        },
        {
            "route": "news_detail",
            "title": "{title} | CBFX News",
            "description": "{title} — the latest forex, crypto and metals news from CBFX.",
        },
        {
            "route": "plays",
            "title": "Trading Plays & Setups | CBFX",
            "description": "Live trade ideas and setups from the CBFX desk — entries, targets and stop losses, updated in real time.",
            "canonical_path": "/plays",
        },
    ]
    for e in entries:
        if not db.query(SeoMeta).filter(SeoMeta.route == e["route"]).first():
            db.add(SeoMeta(**e))
            print(f"  + SeoMeta: {e['route']}")
        else:
            print(f"  . SeoMeta exists: {e['route']}")


# -- Main ---------------------------------------------------------------------

if __name__ == "__main__":
    # Import all models so create_all picks them up
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("\n-- Users -----------------------------")
        seed_users(db)
        db.flush()

        print("\n-- SEO Meta ---------------------------")
        seed_seo_meta(db)
        db.flush()

        db.commit()
        print("\n[OK] Seed complete.\n")
    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] Seed failed: {e}\n")
        raise
    finally:
        db.close()
