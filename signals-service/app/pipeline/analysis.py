import logging
import uuid
from datetime import datetime, timedelta, timezone

from app.clients.backend_client import purge_public_cache
from app.clients.gemini_client import GeminiError, generate_daily_analysis
from app.clients.twelve_data import TwelveDataError, fetch_candles
from app.config import (
    ARTICLE_DEDUPE_WINDOW_HOURS,
    AI_AUTHOR_EMAIL,
    CANDLE_COUNT,
    MARKET_CATEGORY,
    PAIR,
    TWELVE_DATA_SYMBOL,
)
from app.database import SessionLocal
from app.models import Analysis, Article
from app.pipeline.common import ensure_ai_author

DAILY_ANALYSIS_INTERVAL = "1day"

logger = logging.getLogger("signals.analysis")


def _has_recent_article(db) -> bool:
    """At most one published daily-analysis Article per
    ARTICLE_DEDUPE_WINDOW_HOURS window. Now that this job has its own daily
    cron (see worker/index.ts), this is a safety net against a double-fire
    (e.g. both DST-candidate cron ticks matching in the same day), not the
    primary rate limit it used to be when this ran inside the 30-minute
    generate job."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=ARTICLE_DEDUPE_WINDOW_HOURS)
    return (
        db.query(Article)
        .filter(Article.article_type == "analysis", Article.symbol == PAIR, Article.created_at >= cutoff)
        .first()
        is not None
    )


def run_analysis_job() -> dict:
    """Runs once per day (triggered by the Cloudflare Worker cron at 6pm
    America/New_York, see worker/index.ts): publishes one daily
    market-analysis Article + Analysis row for PAIR. Split out of
    run_generate_job() (which used to attempt this on every 30-minute tick,
    gated only by the dedupe window) so it runs on its own predictable
    schedule instead of piggybacking on the signal-generation job."""
    logger.info("Analysis job starting for %s", PAIR)
    db = SessionLocal()
    result: dict = {}
    try:
        ensure_ai_author(db)

        if _has_recent_article(db):
            logger.info("Skipping daily analysis - one was already published in the last %dh", ARTICLE_DEDUPE_WINDOW_HOURS)
            result["daily_analysis"] = "already_published"
        else:
            try:
                daily_candles = fetch_candles(TWELVE_DATA_SYMBOL, DAILY_ANALYSIS_INTERVAL, CANDLE_COUNT)
                daily = generate_daily_analysis(daily_candles)
                db.add(Analysis(
                    id=str(uuid.uuid4()),
                    pair=PAIR,
                    timeframe=DAILY_ANALYSIS_INTERVAL,
                    bias=daily.bias,
                    summary=daily.summary,
                    author_email=AI_AUTHOR_EMAIL,
                ))
                db.add(Article(
                    id=str(uuid.uuid4()),
                    title=daily.title,
                    content=daily.summary,
                    excerpt=daily.excerpt,
                    article_type="analysis",
                    market_category=MARKET_CATEGORY,
                    symbol=PAIR,
                    is_published=True,
                    author_email=AI_AUTHOR_EMAIL,
                ))
                logger.info("Published daily analysis: %s (bias=%s)", daily.title, daily.bias)
                result["daily_analysis"] = "published"
            except (TwelveDataError, GeminiError) as e:
                logger.error("Daily analysis generation failed: %s", e)
                result["daily_analysis"] = f"error: {e}"

        db.commit()
    finally:
        db.close()

    if result.get("daily_analysis") == "published":
        purge_public_cache()

    logger.info("Analysis job finished: %s", result)
    return result
