import logging
import uuid
from datetime import datetime, timedelta, timezone

from app.clients.backend_client import purge_public_cache
from app.clients.gemini_client import GeminiError, generate_daily_analysis, generate_signal
from app.clients.twelve_data import TwelveDataError, fetch_candles
from app.config import (
    AI_AUTHOR_EMAIL,
    ARTICLE_DEDUPE_WINDOW_HOURS,
    CANDLE_COUNT,
    CONFIDENCE_THRESHOLD,
    DUPLICATE_PRICE_TOLERANCE,
    MARKET_CATEGORY,
    PAIR,
    PLAY_TYPE_CONFIG,
    TWELVE_DATA_SYMBOL,
)
from app.database import SessionLocal
from app.models import Analysis, Article, Play
from app.pipeline.common import ensure_ai_author

DAILY_ANALYSIS_INTERVAL = "1day"

logger = logging.getLogger("signals.generate")


def _today_count(db, play_type: str) -> int:
    """How many signals of this play_type this service has already created
    today (UTC calendar day) — the daily_target cap in PLAY_TYPE_CONFIG."""
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        db.query(Play)
        .filter(
            Play.pair == PAIR,
            Play.play_type == play_type,
            Play.author_email == AI_AUTHOR_EMAIL,
            Play.created_at >= start_of_day,
        )
        .count()
    )


def _is_duplicate(db, play_type: str, direction: str, entry_price: float) -> bool:
    """A candidate signal is a duplicate of an already-open signal of the
    same play_type when its direction matches and its entry_price is within
    DUPLICATE_PRICE_TOLERANCE of the existing one's — multiple concurrently
    open signals of the same play_type are otherwise allowed (up to the
    daily_target count each represents)."""
    open_plays = (
        db.query(Play)
        .filter(
            Play.pair == PAIR,
            Play.play_type == play_type,
            Play.author_email == AI_AUTHOR_EMAIL,
            Play.status == "open",
        )
        .all()
    )
    for p in open_plays:
        if p.direction != direction:
            continue
        try:
            existing_entry = float(p.entry_price)
        except ValueError:
            continue
        if existing_entry == 0:
            continue
        if abs(entry_price - existing_entry) / existing_entry <= DUPLICATE_PRICE_TOLERANCE:
            return True
    return False


def _has_recent_article(db) -> bool:
    """At most one published daily-analysis Article per
    ARTICLE_DEDUPE_WINDOW_HOURS window, regardless of how often the generate
    job itself runs."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=ARTICLE_DEDUPE_WINDOW_HOURS)
    return (
        db.query(Article)
        .filter(Article.article_type == "analysis", Article.symbol == PAIR, Article.created_at >= cutoff)
        .first()
        is not None
    )


def run_generate_job() -> dict:
    """Runs once per invocation (triggered every 30 minutes by the Cloudflare
    Worker cron): for each play_type still under its daily target, requests
    a signal from Gemini and saves it as an open Play if it's a "High"
    confidence, non-duplicate, actionable setup. Also publishes one daily
    market-analysis Article (+ an Analysis row) per ARTICLE_DEDUPE_WINDOW_HOURS
    window, independent of whether any signal fired this cycle. Never raises
    for a single play_type's (or the daily analysis') failure — one bad
    model/API call doesn't block the others."""
    logger.info("Generate job starting for %s", PAIR)
    db = SessionLocal()
    result = {"created": [], "skipped": {}}
    try:
        ensure_ai_author(db)

        for play_type, cfg in PLAY_TYPE_CONFIG.items():
            today_count = _today_count(db, play_type)
            if today_count >= cfg["daily_target"]:
                logger.info("%s: daily target (%d) already reached", play_type, cfg["daily_target"])
                result["skipped"][play_type] = "daily_target_reached"
                continue

            try:
                candles = fetch_candles(TWELVE_DATA_SYMBOL, cfg["interval"], CANDLE_COUNT)
                signal_result = generate_signal(play_type, cfg["interval"], candles)
            except (TwelveDataError, GeminiError) as e:
                logger.error("%s: signal generation failed: %s", play_type, e)
                result["skipped"][play_type] = f"error: {e}"
                continue

            if not signal_result.signal:
                logger.info("%s: no actionable setup this run", play_type)
                result["skipped"][play_type] = "no_setup"
                continue

            signal = signal_result.signal
            if signal.confidence < CONFIDENCE_THRESHOLD:
                logger.info(
                    "%s: setup found but confidence=%d < %d, not inserting",
                    play_type, signal.confidence, CONFIDENCE_THRESHOLD,
                )
                result["skipped"][play_type] = f"confidence_{signal.confidence}"
                continue

            entry_price = float(signal.entry_price)
            if _is_duplicate(db, play_type, signal.direction, entry_price):
                logger.info("%s: matches an already-open signal, skipping as duplicate", play_type)
                result["skipped"][play_type] = "duplicate"
                continue

            play = Play(
                id=str(uuid.uuid4()),
                pair=PAIR,
                direction=signal.direction,
                entry_price=signal.entry_price,
                take_profit=signal.take_profit,
                stop_loss=signal.stop_loss,
                timeframe=cfg["interval"],
                play_type=play_type,
                status="open",
                confidence=str(signal.confidence),
                notes=signal.notes,
                author_email=AI_AUTHOR_EMAIL,
            )
            db.add(play)
            db.flush()
            logger.info(
                "%s: created signal %s @ %s (tp=%s, sl=%s, confidence=%s)",
                play_type, signal.direction, signal.entry_price, signal.take_profit, signal.stop_loss, signal.confidence,
            )
            result["created"].append({"play_type": play_type, "id": play.id})

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

    if result["created"] or result.get("daily_analysis") == "published":
        purge_public_cache()

    logger.info("Generate job finished: %s", result)
    return result
