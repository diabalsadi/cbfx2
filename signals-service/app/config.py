import os

from dotenv import load_dotenv

load_dotenv()

# Shared Postgres — the same database the main cbfx backend uses. This
# service is a separate Python project (can't import backend/app), so it
# keeps its own minimal copy of just the columns it needs on `plays`/`users`
# (see app/models.py) rather than the full backend schema.
DATABASE_URL = os.environ["DATABASE_URL"]

TWELVE_DATA_API_KEY = os.environ["TWELVE_DATA_API_KEY"]
TWELVE_DATA_BASE_URL = "https://api.twelvedata.com"

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.7-flash")

# Shared secret the Cloudflare Worker sends on every /tasks/* call — these
# endpoints move data and hit paid APIs, so they must not be publicly
# callable by anyone who finds the container's URL.
TASK_AUTH_TOKEN = os.environ["TASK_AUTH_TOKEN"]

# Main backend's own base URL + its existing /internal/* auth credentials
# (same METAAPI_SYNC_KEY/METAAPI_SYNC_SECRET the MetaApi cron already uses,
# see backend/app/routers/internal.py) — used only to call
# POST /internal/purge-cache after a generate/monitor run changes any plays
# rows. Optional: if unset, cache purging is just skipped (logged, not
# fatal) rather than failing the job.
BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "")
SYNC_KEY = os.getenv("METAAPI_SYNC_KEY", "")
SYNC_SECRET = os.getenv("METAAPI_SYNC_SECRET", "")

# Single-symbol MVP — deliberately not a list yet. Extending to more symbols
# later means parameterizing SYMBOL through the pipeline functions rather
# than adding a loop here; keep it a plain constant until that's needed.
TWELVE_DATA_SYMBOL = "XAU/USD"  # Twelve Data's own symbol spelling
PAIR = "XAU/USD"  # stored in plays.pair — matches the existing seed data's convention

# play_type -> which candle interval it's analyzed on, Twelve Data's own
# interval spelling, and how many signals of that type may be generated per
# UTC calendar day.
PLAY_TYPE_CONFIG = {
    "Scalp": {"interval": "1h", "daily_target": 3},
    "Swing": {"interval": "4h", "daily_target": 1},
    "Long-term": {"interval": "1day", "daily_target": 1},
}

CANDLE_COUNT = 240

# Gold's Article.market_category, matching the values the main app's
# schemas/article.py restricts market_category to (crypto | forex | metals |
# indices).
MARKET_CATEGORY = "metals"

# At most one published daily-analysis Article per rolling window, regardless
# of how often the generate job runs (every 30 min) — avoids both DB clutter
# and a wasted Gemini call on the 47 runs/day that would just be discarded.
ARTICLE_DEDUPE_WINDOW_HOURS = 24

# A candidate signal is rejected as a duplicate of an already-open signal of
# the same play_type when its direction matches and its entry_price is
# within this fraction of the existing one's entry_price.
DUPLICATE_PRICE_TOLERANCE = 0.005  # 0.5%

# Gemini rates every candidate signal's confidence 0-100 (see
# clients/gemini_client.py) — only signals at or above this score are
# inserted. Deliberately never mentioned to the model itself, so it isn't
# tempted to anchor its score toward this cutoff.
CONFIDENCE_THRESHOLD = 70

AI_AUTHOR_EMAIL = "ai-signal@cbfx.com"
AI_AUTHOR_NAME = "CBFX Gold Signals AI"
