from datetime import datetime
from typing import List, TypedDict

import requests

from app.config import TWELVE_DATA_API_KEY, TWELVE_DATA_BASE_URL


class Candle(TypedDict):
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class TwelveDataError(RuntimeError):
    """Raised when Twelve Data can't be reached or returns an error status."""


def fetch_candles(symbol: str, interval: str, outputsize: int) -> List[Candle]:
    """Last `outputsize` closed candles for `symbol` at `interval`
    ("1h"/"4h"/"1day"), oldest first. Twelve Data's own most-recent-first
    ordering is not documented as guaranteed, so this always re-sorts by
    time rather than trusting response order."""
    resp = requests.get(
        f"{TWELVE_DATA_BASE_URL}/time_series",
        params={
            "symbol": symbol,
            "interval": interval,
            "outputsize": outputsize,
            "apikey": TWELVE_DATA_API_KEY,
        },
        timeout=30,
    )
    data = resp.json()
    if data.get("status") == "error" or "values" not in data:
        raise TwelveDataError(f"Twelve Data error for {symbol} ({interval}): {data}")

    candles = [
        Candle(
            time=datetime.fromisoformat(v["datetime"]).isoformat(),
            open=float(v["open"]),
            high=float(v["high"]),
            low=float(v["low"]),
            close=float(v["close"]),
            volume=int(float(v.get("volume") or 0)),
        )
        for v in data["values"]
    ]
    candles.sort(key=lambda c: c["time"])
    return candles


def fetch_latest_price(symbol: str) -> float:
    """Current price via Twelve Data's lightweight /price endpoint — used by
    the 10-minute monitor job, which only needs one number per run rather
    than a full candle set."""
    resp = requests.get(
        f"{TWELVE_DATA_BASE_URL}/price",
        params={"symbol": symbol, "apikey": TWELVE_DATA_API_KEY},
        timeout=30,
    )
    data = resp.json()
    if "price" not in data:
        raise TwelveDataError(f"Twelve Data /price error for {symbol}: {data}")
    return float(data["price"])
