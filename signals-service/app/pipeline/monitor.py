import logging
from datetime import datetime, timezone

from app.clients.backend_client import purge_public_cache
from app.clients.gemini_client import GeminiError, check_signal_validity
from app.clients.twelve_data import TwelveDataError, fetch_candles, fetch_latest_price
from app.config import AI_AUTHOR_EMAIL, CANDLE_COUNT, PAIR, PLAY_TYPE_CONFIG, TWELVE_DATA_SYMBOL
from app.database import SessionLocal
from app.models import Play

logger = logging.getLogger("signals.monitor")


def _check_hit_or_miss(play: Play, current_price: float) -> str | None:
    try:
        tp = float(play.take_profit) if play.take_profit else None
        sl = float(play.stop_loss) if play.stop_loss else None
    except ValueError:
        return None

    if play.direction == "LONG":
        if tp is not None and current_price >= tp:
            return "hit"
        if sl is not None and current_price <= sl:
            return "miss"
    elif play.direction == "SHORT":
        if tp is not None and current_price <= tp:
            return "hit"
        if sl is not None and current_price >= sl:
            return "miss"
    return None


def run_monitor_job() -> dict:
    """Runs once per invocation (triggered every 10 minutes by the Cloudflare
    Worker cron): scans every open AI-generated XAU/USD signal and closes it
    when either (a) real price has mechanically reached its take_profit
    (close_reason="hit") or stop_loss (close_reason="miss"), or (b) the
    model judges the original thesis has clearly broken down
    (close_reason="market_shift") — checked only when (a) hasn't already
    resolved it this run. Scoped to this service's own author_email so a
    manually-created play is never touched."""
    db = SessionLocal()
    result = {"hit": [], "miss": [], "market_shift": [], "errors": []}
    try:
        open_plays = (
            db.query(Play)
            .filter(Play.pair == PAIR, Play.status == "open", Play.author_email == AI_AUTHOR_EMAIL)
            .all()
        )
        if not open_plays:
            logger.info("No open signals to check")
            return result

        try:
            current_price = fetch_latest_price(TWELVE_DATA_SYMBOL)
        except TwelveDataError as e:
            logger.error("Could not fetch current price: %s", e)
            result["errors"].append(str(e))
            return result

        logger.info("Checking %d open signal(s) against current price %s", len(open_plays), current_price)

        # Fetch each play_type's candles at most once per run, shared across
        # every open play of that type, for the validity check below.
        candle_cache: dict[str, list] = {}
        now = datetime.now(timezone.utc)

        for play in open_plays:
            outcome = _check_hit_or_miss(play, current_price)

            if not outcome:
                interval = PLAY_TYPE_CONFIG[play.play_type]["interval"]
                if interval not in candle_cache:
                    try:
                        candle_cache[interval] = fetch_candles(TWELVE_DATA_SYMBOL, interval, CANDLE_COUNT)
                    except TwelveDataError as e:
                        logger.error("Could not fetch %s candles for validity check: %s", interval, e)
                        result["errors"].append(str(e))
                        continue
                try:
                    validity = check_signal_validity(
                        interval, play.direction, play.entry_price, play.take_profit,
                        play.stop_loss, play.notes, candle_cache[interval],
                    )
                    if not validity.still_valid:
                        outcome = "market_shift"
                        play.notes = f"{play.notes or ''}\n\n[Cancelled: {validity.reason}]".strip()
                        logger.info("Cancelling signal %s early - %s", play.id, validity.reason)
                except GeminiError as e:
                    logger.error("Validity check failed for signal %s: %s", play.id, e)
                    result["errors"].append(str(e))

            if outcome:
                play.status = "cancelled" if outcome == "market_shift" else "closed"
                play.close_reason = outcome
                play.closed_at = now
                result[outcome].append(play.id)
                logger.info(
                    "Signal %s (%s %s @ %s) closed as %s at price %s",
                    play.id, play.play_type, play.direction, play.entry_price, outcome, current_price,
                )

        db.commit()
    finally:
        db.close()

    if result["hit"] or result["miss"] or result["market_shift"]:
        purge_public_cache()

    logger.info("Monitor job finished: %s", result)
    return result
