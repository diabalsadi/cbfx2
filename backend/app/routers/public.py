from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.article import Article
from app.models.broker import Broker
from app.models.broker_placement import BrokerPlacement
from app.schemas.broker_placement import SECTIONS as PLACEMENT_SECTIONS
from app.models.ad_banner import AdBanner
from app.models.seo_meta import SeoMeta, SeoSettings
from app.schemas.seo_meta import SEO_ROUTES
from app.models.market_price import MarketPrice
from app.models.copy_trader import CopyTrader
from app.models.play import Play
from app.models.analysis import Analysis
from app.models.forum_reply import ForumReply
from app.models.forum_thread import ForumThread
from app.schemas.article import Article as ArticleSchema
from app.utils.geo import detect_region, extract_client_ip
from app.utils.forum_stats import get_reply_count_lookup
from app.utils.cache import public_cache, PUBLIC_CACHE_TTL_SECONDS

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/articles", response_model=List[ArticleSchema])
def list_published_articles(db: Session = Depends(get_db)):
    """Public — returns only published news articles."""

    def compute():
        rows = (
            db.query(Article)
            .filter(Article.is_published == True, Article.article_type == "news")
            .order_by(Article.created_at.desc())
            .all()
        )
        # Validate to plain Pydantic models before caching — the ORM rows
        # are bound to this request's db session, which closes once the
        # request ends, so a later cache hit must never hand back the raw
        # ORM objects.
        return [ArticleSchema.model_validate(a) for a in rows]

    return public_cache.get_or_set("public:articles:news", PUBLIC_CACHE_TTL_SECONDS, compute)


@router.get("/articles/{article_id}", response_model=ArticleSchema)
def get_published_article(article_id: str, db: Session = Depends(get_db)):
    """Public — returns one published news article."""

    def compute():
        article = (
            db.query(Article)
            .filter(
                Article.id == article_id,
                Article.is_published == True,
                Article.article_type == "news",
            )
            .first()
        )
        return ArticleSchema.model_validate(article) if article else None

    result = public_cache.get_or_set(f"public:articles:news:{article_id}", PUBLIC_CACHE_TTL_SECONDS, compute)
    if not result:
        raise HTTPException(status_code=404, detail="Article not found")
    return result


@router.get("/analysis", response_model=List[ArticleSchema])
def list_published_analysis(db: Session = Depends(get_db)):
    """Public — returns only published articles with article_type='analysis'."""

    def compute():
        rows = (
            db.query(Article)
            .filter(Article.is_published == True, Article.article_type == "analysis")
            .order_by(Article.created_at.desc())
            .all()
        )
        return [ArticleSchema.model_validate(a) for a in rows]

    return public_cache.get_or_set("public:articles:analysis", PUBLIC_CACHE_TTL_SECONDS, compute)


@router.get("/analysis/{article_id}", response_model=ArticleSchema)
def get_published_analysis(article_id: str, db: Session = Depends(get_db)):
    """Public — returns one published analysis article."""

    def compute():
        article = (
            db.query(Article)
            .filter(
                Article.id == article_id,
                Article.is_published == True,
                Article.article_type == "analysis",
            )
            .first()
        )
        return ArticleSchema.model_validate(article) if article else None

    result = public_cache.get_or_set(f"public:articles:analysis:{article_id}", PUBLIC_CACHE_TTL_SECONDS, compute)
    if not result:
        raise HTTPException(status_code=404, detail="Article not found")
    return result


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

    def compute():
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

    return public_cache.get_or_set(f"public:brokers:{country_code}:{region}", PUBLIC_CACHE_TTL_SECONDS, compute)


@router.get("/seo/settings")
def get_public_seo_settings(db: Session = Depends(get_db)):
    """Public — sitewide SEO settings (verification codes, default social
    share fallbacks), fetched once by the root layout's generateMetadata()
    and merged into every page. Missing settings return an all-null object
    rather than 404, same reasoning as get_seo_meta below."""
    def compute():
        settings = db.query(SeoSettings).filter(SeoSettings.id == "global").first()
        if not settings:
            return {
                "google_site_verification": None,
                "bing_site_verification": None,
                "pinterest_site_verification": None,
                "facebook_domain_verification": None,
                "twitter_site": None,
                "default_share_title": None,
                "default_share_description": None,
                "default_share_image": None,
                "default_keywords": None,
            }
        return {
            "google_site_verification": settings.google_site_verification,
            "bing_site_verification": settings.bing_site_verification,
            "pinterest_site_verification": settings.pinterest_site_verification,
            "facebook_domain_verification": settings.facebook_domain_verification,
            "twitter_site": settings.twitter_site,
            "default_share_title": settings.default_share_title,
            "default_share_description": settings.default_share_description,
            "default_share_image": settings.default_share_image,
            "default_keywords": settings.default_keywords,
        }

    return public_cache.get_or_set("public:seo:settings", PUBLIC_CACHE_TTL_SECONDS, compute)


# Declared ahead so "settings" above is never mistaken for a route key by
# this catch-all.
@router.get("/seo/{route}")
def get_seo_meta(route: str, sub_key: Optional[str] = None, db: Session = Depends(get_db)):
    """Public — server-side metadata for one route (optionally a specific
    sub-item, e.g. one market symbol), fetched by the frontend's
    generateMetadata(). Falls back from a sub_key-specific override to the
    route's generic template, and returns null (not 404) if neither is
    configured, so a page never fails to render over missing SEO copy."""
    if route not in SEO_ROUTES:
        return None
    sub_key = (sub_key or "").strip()

    def compute():
        seo = None
        if sub_key:
            seo = db.query(SeoMeta).filter(SeoMeta.route == route, SeoMeta.sub_key == sub_key).first()
        if not seo:
            seo = db.query(SeoMeta).filter(SeoMeta.route == route, SeoMeta.sub_key == "").first()
        if not seo:
            return None
        return {
            "route": seo.route,
            "title": seo.title,
            "description": seo.description,
            "keywords": seo.keywords,
            "og_title": seo.og_title,
            "og_description": seo.og_description,
            "og_image": seo.og_image,
            "twitter_card": seo.twitter_card,
            "canonical_path": seo.canonical_path,
            "robots": seo.robots,
        }

    return public_cache.get_or_set(f"public:seo:{route}:{sub_key}", PUBLIC_CACHE_TTL_SECONDS, compute)


def _banner_content(b: AdBanner) -> dict:
    return {
        "sponsor_name": b.sponsor_name,
        "description": b.description,
        "badge_text": b.badge_text,
        "logo_src": b.logo_src,
        "link_url": b.link_url,
        "cta_label": b.cta_label,
        "features": b.features or [],
        "disclaimer": b.disclaimer,
        "dismissible": b.dismissible,
    }


def _resolve_ad_banners(
    db: Session, page: str, country_code: Optional[str], region: Optional[str]
) -> dict:
    """Active banner ad content for `page`, resolved per slot to the
    visitor's most specific match: a country override, then a region
    override, then the slot's "default" content. A slot is omitted entirely
    if no admin has configured active content for it."""
    banners = (
        db.query(AdBanner)
        .filter(AdBanner.page == page, AdBanner.status == "active")
        .all()
    )

    banners_by_slot: dict = {}
    for b in banners:
        banners_by_slot.setdefault(b.slot, {})[b.region] = b

    resolved = {}
    for slot, region_map in banners_by_slot.items():
        chosen = region_map.get(country_code) if country_code else None
        if not chosen and region:
            chosen = region_map.get(region)
        if not chosen:
            chosen = region_map.get("default")
        if chosen:
            resolved[slot] = _banner_content(chosen)
    return resolved


@router.get("/ad-banners/{page}")
def get_ad_banners(page: str, request: Request, db: Session = Depends(get_db)):
    """Public — resolves active banner ad content for any ad-placement page
    (e.g. "signin"), scoped to the visitor's detected region/country. Pages
    with no configured banners return an empty object."""
    country_code, region = detect_region(extract_client_ip(request))
    return public_cache.get_or_set(
        f"public:ad-banners:{page}:{country_code}:{region}",
        PUBLIC_CACHE_TTL_SECONDS,
        lambda: _resolve_ad_banners(db, page, country_code, region),
    )


def _compute_homepage(db: Session, country_code: Optional[str], region: Optional[str]) -> dict:
    """Builds the homepage payload: market prices, top copy traders, latest
    news, open plays, latest analysis, and recent forum threads. Broker
    placement slots (featured/sponsored/partners) are filtered to brokers
    covering the visitor's region/country. Banner ad slots are included
    only when an admin has configured active content for them."""
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
    reply_counts = get_reply_count_lookup(db, [thread.id for thread in recent_threads])
    for thread in recent_threads:
        thread.reply_count = reply_counts.get(thread.id, 0)

    placements = (
        db.query(BrokerPlacement)
        .order_by(BrokerPlacement.section, BrokerPlacement.region, BrokerPlacement.position)
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

    # Group by section, then by the coverage scope the ordering was configured
    # for, so each section can use its most specific match for the visitor:
    # a country-level override, then a region-level override, then the
    # section's "default" order.
    by_section_region: dict = {}
    for p in placements:
        by_section_region.setdefault(p.section, {}).setdefault(p.region, []).append(p)

    broker_sections = {section: [] for section in PLACEMENT_SECTIONS}
    for section in PLACEMENT_SECTIONS:
        region_map = by_section_region.get(section, {})
        chosen = region_map.get(country_code) if country_code else None
        if not chosen and region:
            chosen = region_map.get(region)
        if not chosen:
            chosen = region_map.get("default", [])
        for p in chosen:
            broker = placed_brokers.get(p.broker_id)
            if not broker:
                continue
            if not _visible_to_visitor(broker, country_code, region):
                continue
            broker_sections[section].append({
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

    ad_banners = _resolve_ad_banners(db, "homepage", country_code, region)

    return {
        "market_prices": [mp(m) for m in market_prices],
        "top_traders": [trader(t) for t in top_traders],
        "latest_news": [news(n) for n in latest_news],
        "open_plays": [play(p) for p in open_plays],
        "latest_analysis": [analysis(a) for a in latest_analysis],
        "recent_threads": [thread(th) for th in recent_threads],
        "broker_sections": broker_sections,
        "ad_banners": ad_banners,
    }


@router.get("/homepage")
def homepage_aggregate(request: Request, db: Session = Depends(get_db)):
    """Public — single call that returns all data needed to render the
    homepage. See _compute_homepage() for what it contains; cached briefly
    per (country_code, region) since it's identical for every anonymous
    visitor in the same location."""
    country_code, region = detect_region(extract_client_ip(request))
    return public_cache.get_or_set(
        f"public:homepage:{country_code}:{region}",
        PUBLIC_CACHE_TTL_SECONDS,
        lambda: _compute_homepage(db, country_code, region),
    )
