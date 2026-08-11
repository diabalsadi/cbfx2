from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.article import Article
from app.models.broker import Broker
from app.models.broker_placement import BrokerPlacement
from app.schemas.broker_placement import SECTIONS as PLACEMENT_SECTIONS
from app.models.market_price import MarketPrice
from app.models.copy_trader import CopyTrader
from app.models.play import Play
from app.models.analysis import Analysis
from app.models.forum_reply import ForumReply
from app.models.forum_thread import ForumThread
from app.schemas.article import Article as ArticleSchema
from app.utils.geo import detect_region, extract_client_ip

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/articles", response_model=List[ArticleSchema])
def list_published_articles(db: Session = Depends(get_db)):
    """Public — returns only published news articles."""
    return (
        db.query(Article)
        .filter(Article.is_published == True, Article.article_type == "news")
        .order_by(Article.created_at.desc())
        .all()
    )


@router.get("/articles/{article_id}", response_model=ArticleSchema)
def get_published_article(article_id: str, db: Session = Depends(get_db)):
    """Public — returns one published news article."""
    article = (
        db.query(Article)
        .filter(
            Article.id == article_id,
            Article.is_published == True,
            Article.article_type == "news",
        )
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


@router.get("/analysis", response_model=List[ArticleSchema])
def list_published_analysis(db: Session = Depends(get_db)):
    """Public — returns only published articles with article_type='analysis'."""
    return (
        db.query(Article)
        .filter(Article.is_published == True, Article.article_type == "analysis")
        .order_by(Article.created_at.desc())
        .all()
    )


@router.get("/analysis/{article_id}", response_model=ArticleSchema)
def get_published_analysis(article_id: str, db: Session = Depends(get_db)):
    """Public — returns one published analysis article."""
    article = (
        db.query(Article)
        .filter(
            Article.id == article_id,
            Article.is_published == True,
            Article.article_type == "analysis",
        )
        .first()
    )
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article


def _covers_visitor(broker: Broker, country_code: Optional[str], region: Optional[str]) -> bool:
    if broker.coverage_type == "country":
        return country_code is not None and country_code in broker.geo_coverage
    return region is not None and region in broker.geo_coverage


def _visible_to_visitor(broker: Broker, country_code: Optional[str], region: Optional[str]) -> bool:
    """Fail-open: if IP geolocation couldn't determine a region/country at all
    (private IP, lookup down, etc.), show everything rather than an empty page.
    Once a location is known, only brokers whose coverage includes it are shown."""
    if country_code is None and region is None:
        return True
    return _covers_visitor(broker, country_code, region)


@router.get("/brokers")
def list_brokers(request: Request, db: Session = Depends(get_db)):
    """Public — returns active brokers whose coverage includes the visitor's
    detected region/country (via best-effort IP geolocation)."""
    country_code, region = detect_region(extract_client_ip(request))

    brokers = (
        db.query(Broker)
        .filter(Broker.status == "active")
        .order_by(Broker.created_at.desc())
        .all()
    )
    return [
        {
            "id": b.id,
            "name": b.name,
            "img_src": b.img_src,
            "coverage_type": b.coverage_type,
            "geo_coverage": b.geo_coverage,
            "cashback_rate": b.cashback_rate,
            "status": b.status,
        }
        for b in brokers
        if _visible_to_visitor(b, country_code, region)
    ]


@router.get("/homepage")
def homepage_aggregate(request: Request, db: Session = Depends(get_db)):
    """
    Public — single call that returns all data needed to render the homepage:
    market prices, top copy traders, latest news, open plays, latest analysis,
    and recent forum threads. Broker placement slots (featured/sponsored/partners)
    are filtered to brokers covering the visitor's detected region/country.
    """
    country_code, region = detect_region(extract_client_ip(request))
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
        .filter(Article.is_published == True, Article.article_type == "news")
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
    for thread in recent_threads:
        thread.reply_count = db.query(ForumReply).filter(ForumReply.thread_id == thread.id).count()

    placements = (
        db.query(BrokerPlacement)
        .order_by(BrokerPlacement.section, BrokerPlacement.position)
        .all()
    )
    placed_brokers = (
        {
            b.id: b
            for b in db.query(Broker).filter(Broker.id.in_({p.broker_id for p in placements})).all()
        }
        if placements
        else {}
    )
    broker_sections = {section: [] for section in PLACEMENT_SECTIONS}
    for p in placements:
        broker = placed_brokers.get(p.broker_id)
        if not broker or p.section not in broker_sections:
            continue
        if not _visible_to_visitor(broker, country_code, region):
            continue
        broker_sections[p.section].append({
            "position": p.position,
            "id": broker.id,
            "name": broker.name,
            "img_src": broker.img_src,
            "cashback_rate": broker.cashback_rate,
        })

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
        "broker_sections": broker_sections,
    }
