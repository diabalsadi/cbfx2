from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.article import Article
from app.models.client import Client
from app.models.market_price import MarketPrice
from app.models.copy_trader import CopyTrader
from app.models.play import Play
from app.models.analysis import Analysis
from app.models.forum_thread import ForumThread
from app.schemas.article import Article as ArticleSchema

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/articles", response_model=List[ArticleSchema])
def list_published_articles(db: Session = Depends(get_db)):
    """Public — returns only published articles (news)."""
    return (
        db.query(Article)
        .filter(Article.is_published == True)
        .order_by(Article.created_at.desc())
        .all()
    )


@router.get("/brokers")
def list_brokers(db: Session = Depends(get_db)):
    """Public — returns active broker/client list."""
    clients = (
        db.query(Client)
        .filter(Client.status == "active")
        .order_by(Client.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "name": c.name,
            "company": c.company,
            "status": c.status,
        }
        for c in clients
    ]


@router.get("/homepage")
def homepage_aggregate(db: Session = Depends(get_db)):
    """
    Public — single call that returns all data needed to render the homepage:
    market prices, top copy traders, latest news, open plays, latest analysis,
    and recent forum threads.
    """
    market_prices = db.query(MarketPrice).order_by(MarketPrice.symbol).all()

    top_traders = (
        db.query(CopyTrader)
        .filter(CopyTrader.is_active == True)
        .order_by(CopyTrader.roi_12m.desc())
        .limit(3)
        .all()
    )

    latest_news = (
        db.query(Article)
        .filter(Article.is_published == True)
        .order_by(Article.created_at.desc())
        .limit(3)
        .all()
    )

    open_plays = (
        db.query(Play)
        .filter(Play.status == "open")
        .order_by(Play.opened_at.desc())
        .limit(5)
        .all()
    )

    latest_analysis = (
        db.query(Analysis)
        .order_by(Analysis.updated_at.desc())
        .limit(5)
        .all()
    )

    recent_threads = (
        db.query(ForumThread)
        .order_by(ForumThread.is_pinned.desc(), ForumThread.created_at.desc())
        .limit(5)
        .all()
    )

    def mp(m):
        return {"symbol": m.symbol, "price": m.price, "change_pct": m.change_pct, "direction": m.direction}

    def trader(t):
        return {
            "id": t.id, "name": t.name, "avatar_initials": t.avatar_initials,
            "roi_12m": t.roi_12m, "followers": t.followers, "win_rate": t.win_rate,
            "strategy": t.strategy, "pairs": t.pairs,
        }

    def news(n):
        return {
            "id": n.id, "title": n.title, "excerpt": n.excerpt,
            "cover_image_url": n.cover_image_url, "created_at": n.created_at.isoformat(),
        }

    def play(p):
        return {
            "id": p.id, "pair": p.pair, "direction": p.direction,
            "entry_price": p.entry_price, "take_profit": p.take_profit,
            "stop_loss": p.stop_loss, "timeframe": p.timeframe,
            "play_type": p.play_type, "status": p.status,
        }

    def analysis(a):
        return {
            "id": a.id, "pair": a.pair, "timeframe": a.timeframe,
            "bias": a.bias, "summary": a.summary,
        }

    def thread(th):
        return {
            "id": th.id, "title": th.title, "category": th.category,
            "author_email": th.author_email, "reply_count": th.reply_count,
            "is_pinned": th.is_pinned, "created_at": th.created_at.isoformat(),
        }

    return {
        "market_prices": [mp(m) for m in market_prices],
        "top_traders": [trader(t) for t in top_traders],
        "latest_news": [news(n) for n in latest_news],
        "open_plays": [play(p) for p in open_plays],
        "latest_analysis": [analysis(a) for a in latest_analysis],
        "recent_threads": [thread(th) for th in recent_threads],
    }
