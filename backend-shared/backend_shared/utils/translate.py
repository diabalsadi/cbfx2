import hashlib
import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend_shared.models.translation import Translation
from backend_shared.services import cloudflare_kv
from backend_shared.utils.cache import PUBLIC_CACHE_TTL_SECONDS

logger = logging.getLogger(__name__)

# The 8 supported target locales. "en" is the source/authored language —
# translation is always skipped for it.
SUPPORTED_LOCALES = {"ar", "en", "es", "fa", "pt", "zh", "vi", "hi"}

# Fields whose content is sanitized rich-text HTML rather than plain text
# (Article.content is rendered via dangerouslySetInnerHTML on the frontend).
# Google's `format` param must be "html" for these so tags are preserved and
# only text nodes are translated; everything else uses "text".
HTML_FIELDS = {"content"}

# Static country -> default-locale mapping, same construction pattern as
# backend_shared.utils.geo.COUNTRY_TO_REGION. Countries not listed here fall through to
# "en". Not exhaustive dialect coverage (e.g. Persian/Dari, MENA Arabic
# variants) — good enough for a sensible IP-geolocation default.
_ARABIC = {
    "AE", "SA", "EG", "QA", "KW", "BH", "OM", "JO", "LB", "SY", "IQ", "YE",
    "LY", "TN", "DZ", "MA", "SD", "SS", "MR", "DJ", "KM", "PS",
}
_FARSI = {"IR", "AF"}
_SPANISH = {
    "ES", "MX", "AR", "CO", "PE", "VE", "CL", "EC", "GT", "CU", "BO", "DO",
    "HN", "PY", "SV", "NI", "CR", "PA", "UY", "GQ",
}
_PORTUGUESE = {"PT", "BR", "AO", "MZ", "CV", "GW", "ST", "TL"}
_CHINESE = {"CN", "TW", "HK", "MO", "SG"}
_VIETNAMESE = {"VN"}
_HINDI = {"IN"}

COUNTRY_TO_LOCALE: dict = {}
for _code in _ARABIC:
    COUNTRY_TO_LOCALE[_code] = "ar"
for _code in _FARSI:
    COUNTRY_TO_LOCALE[_code] = "fa"
for _code in _SPANISH:
    COUNTRY_TO_LOCALE[_code] = "es"
for _code in _PORTUGUESE:
    COUNTRY_TO_LOCALE[_code] = "pt"
for _code in _CHINESE:
    COUNTRY_TO_LOCALE[_code] = "zh"
for _code in _VIETNAMESE:
    COUNTRY_TO_LOCALE[_code] = "vi"
for _code in _HINDI:
    COUNTRY_TO_LOCALE[_code] = "hi"

TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"
# Heavier payloads than detect_region's single geo lookup (batched strings,
# sometimes full article bodies), so a slightly longer fail-open budget.
TRANSLATE_TIMEOUT_SECONDS = 5.0


def detect_locale(request, country_code: Optional[str]) -> str:
    """Resolve the locale to render content in. Mirrors detect_region's call
    shape (request + already-resolved geo signal in, best-effort value out,
    always fails open). Precedence: explicit ?locale= query param (easy to
    curl-test and lets the frontend proxy force a value) -> X-Locale header
    (what the frontend proxy forwards once locale routing lands) ->
    IP-geolocation country default -> "en"."""
    requested = (request.query_params.get("locale") or request.headers.get("x-locale") or "").strip().lower()
    if requested in SUPPORTED_LOCALES:
        return requested
    return COUNTRY_TO_LOCALE.get(country_code or "", "en")


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _google_translate_cache_key(texts: list, target_locale: str, fmt: str) -> str:
    # \x1f (unit separator) as the join char so no real text content could
    # ever be crafted to collide two different (texts, locale, fmt) inputs
    # onto the same digest.
    digest = hashlib.sha256("\x1f".join(texts).encode("utf-8")).hexdigest()
    return f"translate:google:{target_locale}:{fmt}:{digest}"


def _call_google_translate(texts: list, target_locale: str, fmt: str) -> Optional[list]:
    """Best-effort batched call to Google Cloud Translation API v2 (Basic),
    authenticated with a plain API key (form field, no OAuth/SDK). Fails open
    on ANY problem — missing key, network error, timeout, non-200, unexpected
    response shape — returning None so a Google outage or misconfiguration
    never turns a public response into a 500. None (not `texts` unchanged) is
    deliberate: it lets `_translate_many` show the visitor the original text
    for *this* response without permanently caching that fallback as if it
    were a real translation — see its docstring for why that distinction
    matters.

    The actual Google response for a given (texts, target_locale, fmt) batch
    is cached in Cloudflare KV for PUBLIC_CACHE_TTL_SECONDS — this sits in
    front of the network call only; `_translate_many`'s per-string DB cache
    above it is still the permanent store, so a KV miss/expiry never re-bills
    Google for text it has already translated before."""
    api_key = os.getenv("GOOGLE_TRANSLATE_API_KEY")
    if not texts:
        return []
    if not api_key:
        logger.warning("GOOGLE_TRANSLATE_API_KEY is not set; returning untranslated text")
        return None

    cache_key = _google_translate_cache_key(texts, target_locale, fmt)
    cached = cloudflare_kv.get(cache_key)
    if isinstance(cached, list) and len(cached) == len(texts):
        return cached

    fields = [
        ("key", api_key),
        ("target", target_locale),
        ("source", "en"),
        ("format", fmt),
    ] + [("q", t) for t in texts]
    body = urllib.parse.urlencode(fields).encode("utf-8")
    req = urllib.request.Request(TRANSLATE_URL, data=body, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=TRANSLATE_TIMEOUT_SECONDS) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        translations = data["data"]["translations"]
        if len(translations) != len(texts):
            raise ValueError("translation count mismatch")
        result = [t["translatedText"] for t in translations]
        cloudflare_kv.set(cache_key, result, PUBLIC_CACHE_TTL_SECONDS)
        return result
    except urllib.error.HTTPError as e:
        # Google's response body (not just the bare status code) carries the
        # actual reason — e.g. "accessNotConfigured" (API not enabled for this
        # key's project) or "PERMISSION_DENIED" with a human-readable detail —
        # log it so a misconfigured key is diagnosable from the server log
        # instead of just a generic HTTP 403/400 traceback.
        try:
            detail = e.read().decode("utf-8", errors="replace")
        except Exception:
            detail = "<no response body>"
        logger.warning(
            "Google Translate API call failed for locale=%s (%d texts): HTTP %s — %s; returning untranslated text",
            target_locale, len(texts), e.code, detail,
        )
        return None
    except Exception:
        logger.warning(
            "Google Translate API call failed for locale=%s (%d texts); returning untranslated text",
            target_locale, len(texts), exc_info=True,
        )
        return None


def _translate_many(db: Session, texts: list, target_locale: str, fmt: str = "text") -> list:
    """DB-cache-or-call-Google for a batch of strings sharing one format.
    Never raises — any DB or network failure falls back to the original text
    for the affected items in *this* response.

    Critically, a fallback is never written to the Translation cache table —
    only genuine translations are. Caching a failure would be permanent
    (nothing ever re-checks a cache hit), so a single transient Google
    outage would otherwise poison that exact text/locale/format combination
    with the untranslated English forever, even after the outage or a
    misconfigured API key gets fixed. Leaving misses uncached means they
    simply get retried on the next request instead."""
    hashes = [_hash_text(t) for t in texts]
    try:
        rows = (
            db.query(Translation)
            .filter(Translation.target_locale == target_locale, Translation.source_hash.in_(set(hashes)))
            .all()
        )
        cached = {r.source_hash: r.translated_text for r in rows}
    except Exception:
        cached = {}

    results = [cached.get(h) for h in hashes]
    miss_idx = [i for i, v in enumerate(results) if v is None]
    if not miss_idx:
        return results

    miss_texts = [texts[i] for i in miss_idx]
    translated = _call_google_translate(miss_texts, target_locale, fmt)

    if translated is None:
        # Total failure for this batch — fall back to the original text for
        # this response only, without caching that fallback (see docstring).
        for i in miss_idx:
            results[i] = texts[i]
        return results

    for i, new_text in zip(miss_idx, translated):
        results[i] = new_text

    # Persist newly-translated misses. Best-effort: if this fails (including
    # a unique-constraint race against a concurrent identical request), the
    # response is unaffected — `results` already holds the correct values.
    try:
        for i in miss_idx:
            db.add(Translation(source_hash=hashes[i], target_locale=target_locale, translated_text=results[i]))
        db.commit()
    except IntegrityError:
        db.rollback()
    except Exception:
        db.rollback()

    return results


def translate_text(db: Session, text: Optional[str], target_locale: str) -> Optional[str]:
    """Translate a single string. Short-circuits (no DB hit, no API call)
    when there's nothing to translate, the target is English, or the locale
    isn't one of the supported ones."""
    if not text or target_locale == "en" or target_locale not in SUPPORTED_LOCALES:
        return text
    return _translate_many(db, [text], target_locale, "text")[0]


def translate_fields(db: Session, obj: dict, fields: list, target_locale: str) -> dict:
    """Return a NEW dict with the given keys of `obj` translated. Supports
    both plain string fields and list-of-string fields (e.g.
    AdBanner.features). Batches all misses for a given format into as few
    Google API calls as possible (normally just one, since only `content` is
    HTML).

    Never mutates `obj` or any nested list/dict from it — safe to call on a
    dict pulled out of backend_shared.utils.cache.public_cache, whose cached value must
    stay in the source language across requests/locales."""
    if target_locale == "en" or target_locale not in SUPPORTED_LOCALES:
        return obj

    result = dict(obj)
    # (field, index_or_None, text) — index is set for list-of-string fields.
    plan_by_fmt: dict = {}
    for field in fields:
        value = obj.get(field)
        fmt = "html" if field in HTML_FIELDS else "text"
        if isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, str) and item:
                    plan_by_fmt.setdefault(fmt, []).append((field, i, item))
        elif isinstance(value, str) and value:
            plan_by_fmt.setdefault(fmt, []).append((field, None, value))

    list_buffers: dict = {}
    for fmt, plan in plan_by_fmt.items():
        translated = _translate_many(db, [p[2] for p in plan], target_locale, fmt)
        for (field, idx, _), new_text in zip(plan, translated):
            if idx is None:
                result[field] = new_text
            else:
                buf = list_buffers.setdefault(field, list(obj.get(field) or []))
                buf[idx] = new_text
                result[field] = buf
    return result
