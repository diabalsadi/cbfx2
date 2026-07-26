import os
import sys

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
import bcrypt


# ── Users ──────────────────────────────────────────────────────────────────────

def seed_users(db):
    test_users = [
        {"email": "admin@cbfx.com",  "name": "Super Admin",  "role": "admin",  "password": "password123"},
        {"email": "editor@cbfx.com", "name": "Main Editor",  "role": "editor", "password": "password123"},
        {"email": "user@cbfx.com",   "name": "Demo User",    "role": "user",   "password": "password123"},
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
        },
        {
            "title": "BTC reclaims $68k as ETFs see record inflows",
            "excerpt": "Bitcoin climbed back above the $68,000 mark as spot ETF inflows hit a record $1.2 billion in a single day.",
            "content": "Bitcoin surged past $68,000 on Thursday after US spot ETF products reported their biggest single-day inflow...",
            "is_published": True,
            "author_email": ADMIN,
        },
        {
            "title": "NFP beats forecast — USD pops across the board",
            "excerpt": "Non-Farm Payrolls came in at 303k vs 214k expected, sending the DXY to a fresh 5-month high.",
            "content": "Friday's US jobs report crushed expectations with 303k payrolls added in March...",
            "is_published": True,
            "author_email": ADMIN,
        },
        {
            "title": "Gold retreats from all-time highs on profit-taking",
            "excerpt": "XAU/USD pulled back 0.4% after reaching $2,431 as traders locked in gains ahead of the weekend.",
            "content": "Gold edged lower on Friday as investors took profits following the metal's record-breaking rally...",
            "is_published": True,
            "author_email": ADMIN,
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
            "category": "EUR",
            "author_email": ADMIN,
            "reply_count": 42,
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
            "category": "USD",
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


# -- Main ---------------------------------------------------------------------

if __name__ == "__main__":
    # Import all models so create_all picks them up
    import app.models.market_price   # noqa
    import app.models.copy_trader    # noqa
    import app.models.play           # noqa
    import app.models.analysis       # noqa
    import app.models.forum_thread   # noqa
    import app.models.forum_reply    # noqa

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print("\n-- Users -----------------------------")
        seed_users(db)
        print("\n-- Market Prices ---------------------")
        seed_market_prices(db)
        print("\n-- News / Articles -------------------")
        seed_news(db)
        print("\n-- Copy Traders ----------------------")
        seed_copy_traders(db)
        print("\n-- Plays -----------------------------")
        seed_plays(db)
        print("\n-- Analysis --------------------------")
        seed_analysis(db)
        print("\n-- Forum Threads ---------------------")
        seed_forum(db)

        db.commit()
        print("\n[OK] Seed complete.\n")
    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] Seed failed: {e}\n")
        raise
    finally:
        db.close()
