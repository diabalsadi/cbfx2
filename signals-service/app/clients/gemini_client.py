import json
import re
from typing import List, Literal, Optional

from openai import OpenAI
from pydantic import BaseModel, Field, ValidationError

from app.config import GEMINI_API_KEY, GEMINI_BASE_URL, GEMINI_MODEL
from app.clients.twelve_data import Candle

PlayType = Literal["Scalp", "Swing", "Long-term"]

PLAY_TYPE_GUIDANCE: dict[PlayType, str] = {
    "Scalp": "an intraday scalp (position typically held minutes to a few hours)",
    "Swing": "a swing trade (position typically held a few days)",
    "Long-term": "a long-term position trade (position typically held weeks)",
}

SIGNAL_SYSTEM_PROMPT_TEMPLATE = """You are a professional gold (XAU/USD) technical analyst \
writing for the CBFX trading platform. You are given the last N closed {interval} candles \
for XAU/USD, oldest first, as CSV rows of time,open,high,low,close,volume.

You are specifically evaluating this chart for {play_type_guidance}, based on {interval} \
candles.

Base your analysis on Smart Money Concepts (SMC) — read the chart the way an institutional \
order-flow trader would, not with lagging indicators:
- Market structure: identify the current trend via swing highs/lows, and flag any Break of \
Structure (BOS, continuation) or Change of Character (CHoCH, potential reversal).
- Liquidity: locate obvious buy-side liquidity (above recent highs/equal highs) and sell-side \
liquidity (below recent lows/equal lows) — these are where price is drawn to sweep/grab stops \
before reversing or continuing.
- Order blocks: the last opposing candle(s) before a strong impulsive move — these are your \
primary entry zones on a retracement.
- Fair value gaps (FVG) / imbalance: three-candle gaps left by a strong impulsive move that \
price often returns to fill before continuing.
- Premium/discount: where current price sits within the most recent significant range — favor \
longs from a discount (lower half) and shorts from a premium (upper half), using the range's \
equilibrium (50%) as the dividing line.
Only combine these into a setup when several genuinely line up (e.g. a liquidity sweep into an \
order block sitting in a discount zone, followed by a shift in structure) — don't force a \
signal just because one SMC element is present in isolation.

Decide whether there is a genuinely actionable setup with a clear entry, invalidation \
(stop_loss) and target (take_profit) appropriate for {play_type_guidance}. If conditions are \
choppy, structure is unclear, or there is no favorable risk/reward setup right now, set \
`signal` to null rather than forcing a trade idea.

When you do provide a signal:
- `direction`: "LONG" or "SHORT"
- `entry_price`, `take_profit`, `stop_loss`: plain decimal price strings in USD with 2 \
decimal places (e.g. "2418.50"), no currency symbol or commas
- `confidence`: an integer from 0 to 100 reflecting how many of these five factors are present \
and agree with the trade direction — judge THIS setup independently, don't anchor on what you \
expect a "typical" score to be:
  1. A liquidity sweep that already occurred (stop-hunt below/above recent lows/highs)
  2. An order block used as the entry zone
  3. A confirmed BOS or CHoCH in the entry's favor
  4. A fair value gap in the entry's favor
  5. Premium/discount positioning matching the direction (discount for longs, premium for shorts)
  Use these as calibration anchors, not a lookup table — reflect your actual read of the chart, \
  not a rounded bucket:
  - 0-20: none of the five present, or structure actively conflicts with the direction
  - 20-45: one factor present
  - 45-65: two factors present and agree, no major conflict
  - 65-85: three or more factors present and agree, no major conflict
  - 85-100: four or more factors present and agree, exceptionally clean setup
  A single conflicting factor (e.g. higher-timeframe structure pointing the opposite way) should \
  pull the score down a band even if several factors otherwise align.
- `notes`: one or two sentences naming the specific SMC elements behind this trade (e.g. "swept \
sell-side liquidity below the prior low into a bullish order block, CHoCH confirmed on the \
retest") and the key risk

Base every number on the actual candle data provided — never invent price levels outside the \
observed range without justification.

Respond with ONLY a single raw JSON object in exactly this shape — no prose, no markdown code \
fences, no extra keys, no comments:
{{"signal": null | {{"direction": "LONG|SHORT", "entry_price": "...", "take_profit": "...", \
"stop_loss": "...", "confidence": 0-100, "notes": "..."}}}}"""

VALIDITY_SYSTEM_PROMPT = """You are a professional gold (XAU/USD) technical analyst for the \
CBFX trading platform, reviewing an already-open trade signal to decide whether its setup is \
still valid.

You are given the original signal (direction, entry, take_profit, stop_loss, and the original \
rationale) plus the latest closed candles for its timeframe, oldest first, as CSV rows of \
time,open,high,low,close,volume. Price has not yet reached either the take_profit or the \
stop_loss.

Re-evaluate using the same Smart Money Concepts (SMC) lens the original signal was built on — \
market structure (BOS/CHoCH), liquidity, order blocks, fair value gaps, and premium/discount. \
Decide whether the original trade thesis still holds, or whether structure has clearly broken \
down against it (e.g. a Change of Character against the position, price closing back through \
the order block that was the entry rationale, or a liquidity sweep that reversed decisively the \
wrong way) such that the position should be cancelled now rather than left to wait for \
stop_loss. Only flag it invalid on a clear, material change — normal noise or a pullback that's \
still consistent with the original thesis (e.g. a retest of the same order block) is NOT \
grounds for invalidation.

Respond with ONLY a single raw JSON object in exactly this shape — no prose, no markdown code \
fences, no extra keys, no comments:
{"still_valid": true|false, "reason": "one sentence explaining your call"}"""


DAILY_SYSTEM_PROMPT = """You are a professional gold (XAU/USD) market analyst writing for the \
CBFX trading platform. You are given the last N closed D1 (daily) candles for XAU/USD, oldest \
first, as CSV rows of time,open,high,low,close,volume.

Write a daily market analysis piece using Smart Money Concepts (SMC) — market structure \
(BOS/CHoCH), liquidity (buy-side/sell-side, recent sweeps), order blocks, fair value gaps, and \
premium/discount positioning. This is a market commentary piece, not a trade idea — do not \
include a trade signal or specific entry/exit levels.

Produce:
- `bias`: your directional read ("Bullish", "Bearish", or "Neutral")
- `title`: a punchy news-style headline for this piece, under 100 characters
- `excerpt`: one sentence, under 160 characters, previewing the piece for an article card/list
- `summary`: a concise multi-paragraph writeup (structure, key levels, liquidity context, what \
to watch going forward) suitable to publish directly to readers — do not mention that you were \
given CSV data

Base every observation on the actual candle data provided — never invent price levels outside \
the observed range without justification.

Respond with ONLY a single raw JSON object in exactly this shape — no prose, no markdown code \
fences, no extra keys, no comments:
{"bias": "Bullish|Bearish|Neutral", "title": "...", "excerpt": "...", "summary": "..."}"""


class GeminiError(RuntimeError):
    """Raised when the model can't be reached, or its output can't be used."""


class AnalysisOutput(BaseModel):
    bias: Literal["Bullish", "Bearish", "Neutral"]
    title: str
    excerpt: str
    summary: str


class SignalOutput(BaseModel):
    direction: Literal["LONG", "SHORT"]
    entry_price: str
    take_profit: str
    stop_loss: str
    confidence: int = Field(ge=0, le=100)
    notes: str


class SignalResult(BaseModel):
    signal: Optional[SignalOutput] = None


class ValidityResult(BaseModel):
    still_valid: bool
    reason: str


def _candles_to_csv(candles: List[Candle]) -> str:
    lines = ["time,open,high,low,close,volume"]
    for c in candles:
        lines.append(f"{c['time']},{c['open']},{c['high']},{c['low']},{c['close']},{c['volume']}")
    return "\n".join(lines)


def _extract_json(text: str) -> str:
    """Some models wrap their JSON in ```json ... ``` fences despite being
    told not to — strip that off if present."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    return match.group(1) if match else text


def _call_model(system_prompt: str, user_content: str) -> str:
    if not GEMINI_API_KEY:
        raise GeminiError("GEMINI_API_KEY environment variable is required")

    client = OpenAI(api_key=GEMINI_API_KEY, base_url=GEMINI_BASE_URL)
    try:
        completion = client.chat.completions.create(
            model=GEMINI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
    except Exception as e:
        raise GeminiError(f"Gemini request failed: {e}") from e

    if not completion.choices:
        raise GeminiError("Gemini returned no choices")
    choice = completion.choices[0]
    if choice.finish_reason == "content_filter":
        raise GeminiError("Model declined to generate a signal for this request")

    raw = (choice.message.content or "").strip()
    if not raw:
        raise GeminiError("Model returned an empty response")
    return raw


def generate_signal(play_type: PlayType, interval: str, candles: List[Candle]) -> SignalResult:
    """Sends the given candles to Gemini and returns an optional trade
    signal sized for `play_type`, with the model's own confidence rating."""
    system_prompt = SIGNAL_SYSTEM_PROMPT_TEMPLATE.format(
        interval=interval, play_type_guidance=PLAY_TYPE_GUIDANCE[play_type],
    )
    user_content = (
        f"Symbol: XAU/USD\nTimeframe: {interval}\n"
        f"Candles ({len(candles)}, oldest first):\n{_candles_to_csv(candles)}"
    )
    raw = _call_model(system_prompt, user_content)
    try:
        return SignalResult.model_validate(json.loads(_extract_json(raw)))
    except (json.JSONDecodeError, ValidationError) as e:
        raise GeminiError(f"Could not parse model output as valid JSON: {e}\nRaw output: {raw[:1000]}") from e


def check_signal_validity(
    interval: str, direction: str, entry_price: str, take_profit: str,
    stop_loss: str, original_notes: Optional[str], candles: List[Candle],
) -> ValidityResult:
    """Asks the model whether an already-open signal's setup is still valid
    given fresh candle data — used alongside (not instead of) the mechanical
    take_profit/stop_loss price check to catch a thesis that's clearly
    broken down before price mechanically reaches stop_loss."""
    user_content = (
        f"Symbol: XAU/USD\nTimeframe: {interval}\n"
        f"Original signal: {direction} @ {entry_price}, take_profit={take_profit}, stop_loss={stop_loss}\n"
        f"Original rationale: {original_notes or 'none given'}\n"
        f"Candles ({len(candles)}, oldest first):\n{_candles_to_csv(candles)}"
    )
    raw = _call_model(VALIDITY_SYSTEM_PROMPT, user_content)
    try:
        return ValidityResult.model_validate(json.loads(_extract_json(raw)))
    except (json.JSONDecodeError, ValidationError) as e:
        raise GeminiError(f"Could not parse model output as valid JSON: {e}\nRaw output: {raw[:1000]}") from e


def generate_daily_analysis(candles: List[Candle]) -> AnalysisOutput:
    """Sends the given D1 candles to Gemini and returns a daily market
    analysis piece with no attached trade signal — a separate concern from
    generate_signal() above, called at most once per 24h window regardless
    of how often the generate job itself runs (see
    pipeline/generate.py:_has_recent_article)."""
    user_content = (
        f"Symbol: XAU/USD\nTimeframe: 1day\n"
        f"Candles ({len(candles)}, oldest first):\n{_candles_to_csv(candles)}"
    )
    raw = _call_model(DAILY_SYSTEM_PROMPT, user_content)
    try:
        return AnalysisOutput.model_validate(json.loads(_extract_json(raw)))
    except (json.JSONDecodeError, ValidationError) as e:
        raise GeminiError(f"Could not parse model output as valid JSON: {e}\nRaw output: {raw[:1000]}") from e
