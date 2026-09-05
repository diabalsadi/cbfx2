import logging
import uuid
from datetime import datetime, timezone

from app.clients.backend_client import purge_public_cache
from app.clients.gemini_client import GeminiError, generate_signal
from app.clients.twelve_data import TwelveDataError, fetch_candles
from app.config import (
    AI_AUTHOR_EMAIL,
    CANDLE_COUNT,
    CONFIDENCE_THRESHOLD,
    DUPLICATE_PRICE_TOLERANCE,
    PAIR,
    PLAY_TYPE_CONFIG,
    TWELVE_DATA_SYMBOL,
)
from app.database import SessionLocal
from app.models import Play
from app.pipeline.common import ensure_ai_author

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


def run_generate_job() -> dict:
    """Runs once per invocation (triggered every 30 minutes by the Cloudflare
    Worker cron): for each play_type still under its daily target, requests
    a signal from Gemini and saves it as an open Play if it's a "High"
    confidence, non-duplicate, actionable setup. Never raises for a single
    play_type's failure — one bad model/API call doesn't block the others.
    Daily market-analysis publishing used to be bundled into this job; it
    now runs on its own daily cron — see pipeline/analysis.py:run_analysis_job."""
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

        db.commit()
    finally:
        db.close()

    if result["created"]:
        purge_public_cache()

    logger.info("Generate job finished: %s", result)
    return result
