import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.article import Article
from app.models.market_price import MarketPrice
from app.models.copy_trader import CopyTrader
from app.models.play import Play
from app.models.analysis import Analysis
from app.models.forum_thread import ForumThread
from app.models.forum_reply import ForumReply
from app.models.client import Client
from app.models.campaign import Campaign
from app.models.broker import Broker
from app.models.mt5_account import MT5Account
from app.models.wallet_transaction import WalletTransaction
import bcrypt


# ── Users ──────────────────────────────────────────────────────────────────────

def seed_users(db):
    test_users = [
        {"email": "admin@cbfx.com",  "name": "Super Admin",  "role": "super_admin",  "password": "password123"},
        {"email": "editor@cbfx.com", "name": "Main Editor",  "role": "editor", "password": "password123"},
        {"email": "user@cbfx.com",   "name": "Demo User",    "role": "user",   "password": "password123"},
        {"email": "diab.alsadi@cbfx.com", "name": "Diab Al Sadi", "role": "user", "password": "password123"},
    ]
    for tu in test_users:
        if not db.query(User).filter(User.email == tu["email"]).first():
            hashed = bcrypt.hashpw(tu["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            db.add(User(email=tu["email"], name=tu["name"], role=tu["role"], hashed_password=hashed))
            print(f"  + User: {tu['email']}")
        else:
            print(f"  . User exists: {tu['email']}")


# ── Market Prices ──────────────────────────────────────────────────────────────

def seed_market_prices(db):
    prices = [
        {"symbol": "EUR/USD", "price": "1.0842", "change_pct": "+0.32%", "direction": "up"},
        {"symbol": "BTC/USD", "price": "68,420", "change_pct": "+1.84%", "direction": "up"},
        {"symbol": "XAU/USD", "price": "2,348.7","change_pct": "-0.41%", "direction": "down"},
        {"symbol": "GBP/JPY", "price": "192.55", "change_pct": "+0.18%", "direction": "up"},
        {"symbol": "USD/JPY", "price": "157.21", "change_pct": "+0.09%", "direction": "up"},
        {"symbol": "ETH/USD", "price": "3,612",  "change_pct": "-0.74%", "direction": "down"},
    ]
    for p in prices:
        if not db.query(MarketPrice).filter(MarketPrice.symbol == p["symbol"]).first():
            db.add(MarketPrice(**p))
            print(f"  + MarketPrice: {p['symbol']}")
        else:
            print(f"  . MarketPrice exists: {p['symbol']}")


# ── News / Articles ────────────────────────────────────────────────────────────

def seed_news(db):
    ADMIN = "admin@cbfx.com"
    articles = [
        {
            "title": "ECB holds rates, signals June cut",
            "excerpt": "The European Central Bank kept rates unchanged at its April meeting while strongly hinting at a first cut in June.",
            "content": "The ECB governing council voted unanimously to hold the deposit facility rate at 4.0% today...",
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "news",
        },
        {
            "title": "BTC reclaims $68k as ETFs see record inflows",
            "excerpt": "Bitcoin climbed back above the $68,000 mark as spot ETF inflows hit a record $1.2 billion in a single day.",
            "content": "Bitcoin surged past $68,000 on Thursday after US spot ETF products reported their biggest single-day inflow...",
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "news",
        },
        {
            "title": "NFP beats forecast — USD pops across the board",
            "excerpt": "Non-Farm Payrolls came in at 303k vs 214k expected, sending the DXY to a fresh 5-month high.",
            "content": "Friday's US jobs report crushed expectations with 303k payrolls added in March...",
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "news",
        },
        {
            "title": "Gold retreats from all-time highs on profit-taking",
            "excerpt": "XAU/USD pulled back 0.4% after reaching $2,431 as traders locked in gains ahead of the weekend.",
            "content": "Gold edged lower on Friday as investors took profits following the metal's record-breaking rally...",
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "news",
        },
        {
            "title": "GBP/USD Technical Analysis: Bullish breakout above 1.2650",
            "excerpt": "Price reclaimed the 1.2650 structure. Expecting continuation to 1.2800 if London opens above 1.2660.",
            "content": "GBP/USD broke above the key 1.2650 resistance level on the 4H timeframe, signaling a potential trend reversal...",
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "analysis",
        },
        {
            "title": "USD/JPY Daily Outlook: Bearish bias below 157.50",
            "excerpt": "Daily shooting star at 157.50. BOJ intervention risk rising. Watch for break of 156.00.",
            "content": "USD/JPY formed a daily shooting star candle at the 157.50 resistance level, suggesting potential exhaustion...",
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "analysis",
        },
        {
            "title": "Gold Weekly Analysis: Bullish trend intact, buy dips to $2,300",
            "excerpt": "Weekly bullish trend intact. Any pullback to 2,300 is a buy opportunity with SL at 2,270.",
            "content": "XAU/USD continues to show strong weekly momentum. The precious metal has established a clear uptrend...",
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "analysis",
        },
        {
            "title": "EUR/USD Range Play: Consolidation ahead of CPI",
            "excerpt": "Consolidating in 1.0780–1.0900 range ahead of CPI. Breakout direction determines bias.",
            "content": "EUR/USD has been trapped in a tight 120-pip range for the past two weeks as markets await key inflation data...",
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "analysis",
        },
        {
            "title": "BTC/USD Analysis: ETF demand keeps the bullish structure intact",
            "excerpt": "Bitcoin is holding above its key support zone while institutional demand continues to support the broader trend.",
            "cover_image_url": "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=1600&q=80",
            "content": '''<p>BTC/USD remains constructive above the daily support zone. The next major decision area is the previous range high, where momentum needs to confirm a continuation.</p><img src="https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=1400&q=80" alt="Bitcoin market analysis" /><h2>What to watch</h2><p>Keep an eye on the reaction around support and whether volume expands on a break above resistance.</p><div data-youtube-video><iframe src="https://www.youtube.com/embed/6fQEA5vZPSY" width="640" height="360" frameborder="0" allowfullscreen="true"></iframe></div><p>This video is included as an example of the YouTube embed available in the article editor.</p>''',
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "analysis",
            "market_category": "crypto",
            "symbol": "BTC/USD",
        },
        {
            "title": "XAU/USD Analysis: Gold buyers defend the weekly demand zone",
            "excerpt": "Gold is consolidating near a key demand area; a reclaim of the recent high would put the bullish continuation back in play.",
            "cover_image_url": "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1600&q=80",
            "content": '''<p>XAU/USD is respecting the weekly demand zone after a measured pullback. A higher low on the four-hour chart would strengthen the bullish case.</p><img src="https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1400&q=80" alt="Gold market analysis" /><h2>Trade idea</h2><p>Wait for confirmation before entering, with invalidation below the demand zone and the recent high as the first upside objective.</p>''',
            "is_published": True,
            "author_email": ADMIN,
            "article_type": "analysis",
            "market_category": "metals",
            "symbol": "XAU/USD",
        },
    ]
    for a in articles:
        if not db.query(Article).filter(Article.title == a["title"]).first():
            db.add(Article(**a))
            print(f"  + Article: {a['title'][:50]}")
        else:
            print(f"  . Article exists: {a['title'][:50]}")


# ── Copy Traders ───────────────────────────────────────────────────────────────

def seed_copy_traders(db):
    traders = [
        {
            "name": "Alex Morgan",     "avatar_initials": "AM",
            "bio": "Pro SMC trader, 8 years in FX. Specialises in London open setups.",
            "roi_12m": 184.0, "roi_3m": 52.3, "roi_1m": 14.1,
            "followers": 12400, "win_rate": 68.5, "drawdown": 11.2,
            "strategy": "Swing", "pairs": ["EUR/USD", "GBP/USD", "XAU/USD"],
            "is_featured": True,
        },
        {
            "name": "Priya Shah",      "avatar_initials": "PS",
            "bio": "Algorithmic swing trader. Focus on Asian session momentum.",
            "roi_12m": 147.0, "roi_3m": 39.8, "roi_1m": 10.5,
            "followers": 9100,  "win_rate": 63.2, "drawdown": 9.4,
            "strategy": "Swing", "pairs": ["USD/JPY", "AUD/USD", "ETH/USD"],
            "is_featured": False,
        },
        {
            "name": "Marco Rossi",     "avatar_initials": "MR",
            "bio": "Scalper on gold and indices. 5–15 pip targets, tight stops.",
            "roi_12m": 121.0, "roi_3m": 30.2, "roi_1m": 8.9,
            "followers": 7800,  "win_rate": 71.0, "drawdown": 7.8,
            "strategy": "Scalping", "pairs": ["XAU/USD", "GBP/JPY"],
            "is_featured": False,
        },
        {
            "name": "Sarah Chen",      "avatar_initials": "SC",
            "bio": "Position trader. Weekly bias, macro-driven entries.",
            "roi_12m": 98.5,  "roi_3m": 24.1, "roi_1m": 6.3,
            "followers": 5200,  "win_rate": 58.7, "drawdown": 14.3,
            "strategy": "Position", "pairs": ["EUR/USD", "BTC/USD"],
            "is_featured": False,
        },
        {
            "name": "James Obi",       "avatar_initials": "JO",
            "bio": "Crypto and FX hybrid. ICT concepts on 15m–1H.",
            "roi_12m": 210.0, "roi_3m": 61.0, "roi_1m": 18.2,
            "followers": 15300, "win_rate": 66.1, "drawdown": 17.9,
            "strategy": "Scalping", "pairs": ["BTC/USD", "ETH/USD", "EUR/USD"],
            "is_featured": True,
        },
        {
            "name": "Liu Wei",         "avatar_initials": "LW",
            "bio": "Swing setups on major pairs. Daily bias, 4H entries.",
            "roi_12m": 76.2,  "roi_3m": 18.9, "roi_1m": 5.1,
            "followers": 3800,  "win_rate": 61.4, "drawdown": 8.1,
            "strategy": "Swing", "pairs": ["USD/JPY", "EUR/USD", "GBP/JPY"],
            "is_featured": False,
        },
    ]
    for t in traders:
        if not db.query(CopyTrader).filter(CopyTrader.name == t["name"]).first():
            db.add(CopyTrader(**t))
            print(f"  + CopyTrader: {t['name']}")
        else:
            print(f"  . CopyTrader exists: {t['name']}")


# ── Plays ──────────────────────────────────────────────────────────────────────

def seed_plays(db):
    ADMIN = "admin@cbfx.com"
    plays = [
        {
            "pair": "EUR/USD", "direction": "LONG",
            "entry_price": "1.0842", "take_profit": "1.0940", "stop_loss": "1.0790",
            "timeframe": "4H", "play_type": "Swing", "status": "open",
            "notes": "Break of structure on 4H, targeting the weekly FVG.",
            "author_email": ADMIN,
        },
        {
            "pair": "XAU/USD", "direction": "SHORT",
            "entry_price": "2,348", "take_profit": "2,310", "stop_loss": "2,370",
            "timeframe": "1D", "play_type": "Swing", "status": "open",
            "notes": "Daily bearish engulf at premium. Targeting EQL lows.",
            "author_email": ADMIN,
        },
        {
            "pair": "BTC/USD", "direction": "LONG",
            "entry_price": "67,900", "take_profit": "71,500", "stop_loss": "66,200",
            "timeframe": "1D", "play_type": "Long-term", "status": "open",
            "notes": "Weekly demand zone hold. ETF inflows supporting.",
            "author_email": ADMIN,
        },
        {
            "pair": "GBP/JPY", "direction": "LONG",
            "entry_price": "192.00", "take_profit": "193.50", "stop_loss": "191.20",
            "timeframe": "1H", "play_type": "Scalp", "status": "open",
            "notes": "Asian session liquidity sweep. London continuation.",
            "author_email": ADMIN,
        },
    ]
    for p in plays:
        if not db.query(Play).filter(Play.pair == p["pair"], Play.entry_price == p["entry_price"]).first():
            db.add(Play(**p))
            print(f"  + Play: {p['direction']} {p['pair']}")
        else:
            print(f"  . Play exists: {p['direction']} {p['pair']}")


# ── Analysis ───────────────────────────────────────────────────────────────────

def seed_analysis(db):
    ADMIN = "admin@cbfx.com"
    entries = [
        {
            "pair": "GBP/USD", "timeframe": "4H", "bias": "Bullish",
            "summary": "Price reclaimed the 1.2650 structure. Expecting continuation to 1.2800 if London opens above 1.2660.",
            "author_email": ADMIN,
        },
        {
            "pair": "USD/JPY", "timeframe": "1D", "bias": "Bearish",
            "summary": "Daily shooting star at 157.50. BOJ intervention risk rising. Watch for break of 156.00.",
            "author_email": ADMIN,
        },
        {
            "pair": "XAU/USD", "timeframe": "1W", "bias": "Bullish",
            "summary": "Weekly bullish trend intact. Any pullback to 2,300 is a buy opportunity with SL at 2,270.",
            "author_email": ADMIN,
        },
        {
            "pair": "EUR/USD", "timeframe": "1D", "bias": "Neutral",
            "summary": "Consolidating in 1.0780–1.0900 range ahead of CPI. Breakout direction determines bias.",
            "author_email": ADMIN,
        },
        {
            "pair": "BTC/USD", "timeframe": "1D", "bias": "Bullish",
            "summary": "Higher lows structure intact. $70k psychological resistance is the next target.",
            "author_email": ADMIN,
        },
    ]
    for e in entries:
        if not db.query(Analysis).filter(Analysis.pair == e["pair"], Analysis.timeframe == e["timeframe"]).first():
            db.add(Analysis(**e))
            print(f"  + Analysis: {e['pair']} {e['timeframe']} ({e['bias']})")
        else:
            print(f"  . Analysis exists: {e['pair']} {e['timeframe']}")


# ── Forum Threads ──────────────────────────────────────────────────────────────

def seed_forum(db):
    ADMIN = "admin@cbfx.com"
    threads = [
        {
            "title": "EUR/USD: weekly bias for next week?",
            "body": "Looking at the daily chart, price is sitting right at a key support. What's your bias heading into next week? I'm leaning long with a tight stop.",
            "category": "Forex",
            "author_email": ADMIN,
            "reply_count": 42,
            "image_url": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80",
            "is_pinned": False,
        },
        {
            "title": "Best SMC setups on gold right now",
            "body": "XAU is showing a beautiful bearish order block on the 4H. Anyone else watching the 2350 zone for a short?",
            "category": "Metals",
            "author_email": ADMIN,
            "reply_count": 31,
            "is_pinned": False,
        },
        {
            "title": "Anyone backtested the London open strategy?",
            "body": "I've been running backtests on the London open sweep + continuation setup for the last 6 months. Results are solid — 68% win rate on EUR/USD. Happy to share my data.",
            "category": "Strategy",
            "author_email": ADMIN,
            "reply_count": 27,
            "is_pinned": True,
        },
        {
            "title": "BTC halving aftermath — your predictions?",
            "body": "Now that the halving is done, where do you see BTC in 6 months? Historical patterns suggest a parabolic move but macro headwinds are real.",
            "category": "CRYPTO",
            "author_email": ADMIN,
            "reply_count": 58,
            "is_pinned": False,
        },
        {
            "title": "NFP this Friday — how are you positioning?",
            "body": "Big data week. NFP consensus is 214k. A beat will likely pump USD across the board. How are you trading it?",
            "category": "Forex",
            "author_email": ADMIN,
            "reply_count": 19,
            "is_pinned": False,
        },
    ]
    for th in threads:
        if not db.query(ForumThread).filter(ForumThread.title == th["title"]).first():
            db.add(ForumThread(**th))
            print(f"  * Thread: {th['title'][:55]}")
        else:
            print(f"  . Thread exists: {th['title'][:55]}")


def migrate_forum_categories(db):
    updated = (
        db.query(ForumThread)
        .filter(ForumThread.category.in_(["EUR", "USD"]))
        .update({ForumThread.category: "Forex"}, synchronize_session=False)
    )
    if updated:
        print(f"  ~ Migrated {updated} thread(s) from EUR/USD to Forex")
    else:
        print("  . No EUR/USD forum categories to migrate")


def seed_forum_replies(db):
    CHART_IMAGE = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80"
    GOLD_IMAGE = "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=80"
    BTC_IMAGE = "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=1200&q=80"

    replies = [
        {
            "thread_title": "EUR/USD: weekly bias for next week?",
            "author_email": "editor@cbfx.com",
            "body": "I am watching the 1.0780 support closely. A daily close above 1.0850 would strengthen the long idea.",
        },
        {
            "thread_title": "EUR/USD: weekly bias for next week?",
            "author_email": "user@cbfx.com",
            "body": "Same view here. I will wait for London to confirm the direction before entering.",
        },
        {
            "thread_title": "EUR/USD: weekly bias for next week?",
            "author_email": "editor@cbfx.com",
            "body": "The chart below shows how the 1.0800 zone held during the last session.",
            "image_url": CHART_IMAGE,
        },
        {
            "thread_title": "EUR/USD: weekly bias for next week?",
            "author_email": "user@cbfx.com",
            "body": "",
            "image_url": CHART_IMAGE,
        },
        {
            "thread_title": "Best SMC setups on gold right now",
            "author_email": "editor@cbfx.com",
            "body": "The 2350 area is important, but I would rather see a clear liquidity sweep before looking for a short.",
        },
        {
            "thread_title": "Best SMC setups on gold right now",
            "author_email": "admin@cbfx.com",
            "body": "Daily structure from my session — watching for a sweep into the order block.",
            "image_url": GOLD_IMAGE,
        },
        {
            "thread_title": "BTC halving aftermath — your predictions?",
            "author_email": "user@cbfx.com",
            "body": "The higher-timeframe trend is still bullish for me. Risk management matters more than predicting the exact top.",
        },
        {
            "thread_title": "BTC halving aftermath — your predictions?",
            "author_email": "editor@cbfx.com",
            "body": "",
            "image_url": BTC_IMAGE,
        },
    ]

    for reply in replies:
        thread = db.query(ForumThread).filter(ForumThread.title == reply["thread_title"]).first()
        if not thread:
            continue

        image_url = reply.get("image_url")
        exists = (
            db.query(ForumReply)
            .filter(
                ForumReply.thread_id == thread.id,
                ForumReply.author_email == reply["author_email"],
                ForumReply.body == reply["body"],
                ForumReply.image_url == image_url,
            )
            .first()
        )
        if exists:
            print(f"  . Reply exists: {reply['thread_title'][:45]}")
            continue

        db.add(
            ForumReply(
                thread_id=thread.id,
                author_email=reply["author_email"],
                body=reply["body"],
                image_url=image_url,
            )
        )
        print(f"  + Reply: {reply['thread_title'][:45]}")


# ── Clients ────────────────────────────────────────────────────────────────────

def seed_clients(db):
    clients = [
        {
            "company_name": "Acme Corp",
            "contact_name": "John Doe",
            "contact_email": "john@acme.com",
            "phone": "+1 555 123 4567",
            "monthly_budget": 10000.0,
            "status": "active"
        },
        {
            "company_name": "Globex Inc",
            "contact_name": "Jane Smith",
            "contact_email": "jane@globex.com",
            "phone": "+1 555 987 6543",
            "monthly_budget": 5000.0,
            "status": "prospect"
        },
    ]
    for c in clients:
        if not db.query(Client).filter(Client.company_name == c["company_name"]).first():
            db.add(Client(**c))
            print(f"  + Client: {c['company_name']}")
        else:
            print(f"  . Client exists: {c['company_name']}")


# ── Campaigns ──────────────────────────────────────────────────────────────────

def seed_campaigns(db):
    ADMIN = "admin@cbfx.com"
    # Find a client to associate
    client = db.query(Client).filter(Client.company_name == "Acme Corp").first()
    client_id = client.id if client else None

    campaigns = [
        {
            "name": "Summer Push 2025",
            "client_id": client_id,
            "budget": 5000.0,
            "impressions": 125000,
            "clicks": 3400,
            "spend": 1250.0,
            "status": "active",
            "created_by": ADMIN
        },
        {
            "name": "Q3 Forex Awareness",
            "client_id": client_id,
            "budget": 10000.0,
            "impressions": 500000,
            "clicks": 15000,
            "spend": 8500.0,
            "status": "completed",
            "created_by": ADMIN
        },
    ]
    for c in campaigns:
        if not db.query(Campaign).filter(Campaign.name == c["name"]).first():
            db.add(Campaign(**c))
            print(f"  + Campaign: {c['name']}")
        else:
            print(f"  . Campaign exists: {c['name']}")


# ── Brokers ────────────────────────────────────────────────────────────────────

def seed_brokers(db):
    brokers = [
        {
            "name": "CFI",
            "img_src": None,
            "coverage_type": "region",
            "geo_coverage": ["middle_east", "africa", "europe"],
            "cashback_rate": 75.0,
            "status": "active",
        },
        {
            "name": "Exness",
            "img_src": None,
            "coverage_type": "region",
            "geo_coverage": ["europe", "asia", "africa", "middle_east", "south_america"],
            "cashback_rate": 88.0,
            "status": "active",
        },
        {
            "name": "Apex Markets",
            "img_src": None,
            "coverage_type": "country",
            "geo_coverage": ["US", "CA"],
            "cashback_rate": 85.0,
            "status": "active",
        },
        {
            "name": "IC Markets",
            "img_src": None,
            "coverage_type": "region",
            "geo_coverage": ["asia", "south_america"],
            "cashback_rate": 80.0,
            "status": "active",
        },
        {
            "name": "XM Global",
            "img_src": None,
            "coverage_type": "region",
            "geo_coverage": ["europe", "middle_east", "africa", "asia"],
            "cashback_rate": 75.0,
            "status": "active",
        },
        {
            "name": "Pepperstone",
            "img_src": None,
            "coverage_type": "country",
            "geo_coverage": ["GB", "AU", "DE", "FR"],
            "cashback_rate": 72.0,
            "status": "active",
        },
        {
            "name": "FBS",
            "img_src": None,
            "coverage_type": "region",
            "geo_coverage": ["asia", "africa"],
            "cashback_rate": 65.0,
            "status": "active",
        },
    ]
    for b in brokers:
        if not db.query(Broker).filter(Broker.name == b["name"]).first():
            db.add(Broker(**b))
            print(f"  + Broker: {b['name']}")
        else:
            print(f"  . Broker exists: {b['name']}")


# ── MT5 Accounts / Cashback Wallets ───────────────────────────────────────────

def seed_mt5_accounts(db):
    # Demonstrates a user with more than one MT5 account on the same broker
    # (user@cbfx.com has two IC Markets accounts), plus a second user with
    # accounts spread across different brokers.
    accounts = [
        {"user_email": "user@cbfx.com", "broker_name": "IC Markets", "mt5_number": "50219384", "balance": 128.40, "lifetime_earned": 512.90},
        {"user_email": "user@cbfx.com", "broker_name": "IC Markets", "mt5_number": "50298213", "balance": 76.90, "lifetime_earned": 156.00},
        {"user_email": "user@cbfx.com", "broker_name": "XM Global", "mt5_number": "88213765", "balance": 54.10, "lifetime_earned": 289.20},
        {"user_email": "diab.alsadi@cbfx.com", "broker_name": "Exness", "mt5_number": "77128456", "balance": 301.40, "lifetime_earned": 1204.60},
        {"user_email": "diab.alsadi@cbfx.com", "broker_name": "Pepperstone", "mt5_number": "91345612", "balance": 42.00, "lifetime_earned": 198.50},
    ]
    for a in accounts:
        broker = db.query(Broker).filter(Broker.name == a["broker_name"]).first()
        if not broker:
            print(f"  ! Broker not found, skipping: {a['broker_name']}")
            continue
        exists = (
            db.query(MT5Account)
            .filter(MT5Account.broker_id == broker.id, MT5Account.mt5_number == a["mt5_number"])
            .first()
        )
        if exists:
            print(f"  . MT5Account exists: {a['broker_name']} #{a['mt5_number']}")
            continue
        db.add(
            MT5Account(
                user_email=a["user_email"],
                broker_id=broker.id,
                mt5_number=a["mt5_number"],
                balance=a["balance"],
                lifetime_earned=a["lifetime_earned"],
            )
        )
        print(f"  + MT5Account: {a['user_email']} -> {a['broker_name']} #{a['mt5_number']}")


# ── Wallet Transactions (money in / money out history) ────────────────────────

def seed_wallet_transactions(db):
    now = datetime.now(timezone.utc)

    def days_ago(n):
        return now - timedelta(days=n)

    # (broker_name, mt5_number) -> list of {type, amount, description, days_ago}
    transactions_by_account = {
        ("IC Markets", "50219384"): [
            {"type": "credit", "amount": 104.30, "description": "Cashback rebate", "days_ago": 40},
            {"type": "debit", "amount": 60.00, "description": "Withdrawal to bank account", "days_ago": 24},
            {"type": "credit", "amount": 38.90, "description": "Cashback rebate", "days_ago": 24},
            {"type": "credit", "amount": 45.20, "description": "Cashback rebate", "days_ago": 10},
        ],
        ("IC Markets", "50298213"): [
            {"type": "credit", "amount": 30.00, "description": "Cashback rebate", "days_ago": 35},
            {"type": "credit", "amount": 76.90, "description": "Cashback rebate", "days_ago": 12},
        ],
        ("XM Global", "88213765"): [
            {"type": "credit", "amount": 25.00, "description": "Cashback rebate", "days_ago": 20},
            {"type": "debit", "amount": 25.00, "description": "Withdrawal to Skrill", "days_ago": 8},
            {"type": "credit", "amount": 54.10, "description": "Cashback rebate", "days_ago": 3},
        ],
        ("Exness", "77128456"): [
            {"type": "credit", "amount": 101.40, "description": "Cashback rebate", "days_ago": 60},
            {"type": "credit", "amount": 200.00, "description": "Cashback rebate", "days_ago": 45},
            {"type": "debit", "amount": 150.00, "description": "Withdrawal to bank account", "days_ago": 15},
            {"type": "credit", "amount": 301.40, "description": "Cashback rebate", "days_ago": 3},
        ],
        ("Pepperstone", "91345612"): [
            {"type": "credit", "amount": 42.00, "description": "Cashback rebate", "days_ago": 6},
        ],
    }

    for (broker_name, mt5_number), txs in transactions_by_account.items():
        broker = db.query(Broker).filter(Broker.name == broker_name).first()
        if not broker:
            print(f"  ! Broker not found, skipping: {broker_name}")
            continue
        account = (
            db.query(MT5Account)
            .filter(MT5Account.broker_id == broker.id, MT5Account.mt5_number == mt5_number)
            .first()
        )
        if not account:
            print(f"  ! MT5Account not found, skipping: {broker_name} #{mt5_number}")
            continue

        for tx in txs:
            exists = (
                db.query(WalletTransaction)
                .filter(
                    WalletTransaction.mt5_account_id == account.id,
                    WalletTransaction.type == tx["type"],
                    WalletTransaction.amount == tx["amount"],
                    WalletTransaction.description == tx["description"],
                )
                .first()
            )
            if exists:
                print(f"  . Transaction exists: {broker_name} #{mt5_number} {tx['type']} {tx['amount']}")
                continue
            db.add(
                WalletTransaction(
                    mt5_account_id=account.id,
                    type=tx["type"],
                    amount=tx["amount"],
                    description=tx["description"],
                    created_at=days_ago(tx["days_ago"]),
                )
            )
            print(f"  + Transaction: {broker_name} #{mt5_number} {tx['type']} ${tx['amount']}")


# -- Main ---------------------------------------------------------------------

if __name__ == "__main__":
    # Import all models so create_all picks them up
    import app.models.market_price   # noqa
    import app.models.copy_trader    # noqa
    import app.models.play           # noqa
    import app.models.analysis       # noqa
    import app.models.forum_thread   # noqa
    import app.models.forum_reply    # noqa
    import app.models.client         # noqa
    import app.models.campaign       # noqa
    import app.models.broker         # noqa
    import app.models.mt5_account    # noqa
    import app.models.wallet_transaction  # noqa

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("\n-- Users -----------------------------")
        seed_users(db)
        db.flush()

        print("\n-- Market Prices ---------------------")
        seed_market_prices(db)
        db.flush()

        print("\n-- News / Articles -------------------")
        seed_news(db)
        db.flush()

        print("\n-- Copy Traders ----------------------")
        seed_copy_traders(db)
        db.flush()

        print("\n-- Plays -----------------------------")
        seed_plays(db)
        db.flush()

        print("\n-- Analysis --------------------------")
        seed_analysis(db)
        db.flush()

        print("\n-- Forum Threads ---------------------")
        migrate_forum_categories(db)
        seed_forum(db)
        db.flush()

        print("\n-- Forum Replies ---------------------")
        seed_forum_replies(db)
        db.flush()

        print("\n-- Clients ---------------------------")
        seed_clients(db)
        db.flush()

        print("\n-- Campaigns -------------------------")
        seed_campaigns(db)
        db.flush()

        print("\n-- Brokers ---------------------------")
        seed_brokers(db)
        db.flush()

        print("\n-- MT5 Accounts -----------------------")
        seed_mt5_accounts(db)
        db.flush()

        print("\n-- Wallet Transactions -----------------")
        seed_wallet_transactions(db)
        db.flush()

        db.commit()
        print("\n[OK] Seed complete.\n")
    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] Seed failed: {e}\n")
        raise
    finally:
        db.close()
