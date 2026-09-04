"""Cloudflare Workers KV REST client — the backing store for backend_shared.utils.cache
and the translation hot-cache. Every call is best-effort/fail-open: a
missing token, network error, or unexpected response never raises past this
module. Caching must never turn a working response into a 500.

Requires three env vars, none defaulted here — all live in .env, never in
this file:
  CF_ACCOUNT_ID       — the Cloudflare account that owns the namespace
  CF_KV_API_TOKEN     — API token with "Workers KV Storage: Edit" permission
  CF_KV_NAMESPACE_ID  — target namespace id (the "tradeverse" namespace)
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, List, Optional

API_BASE = "https://api.cloudflare.com/client/v4/accounts"
REQUEST_TIMEOUT_SECONDS = 3.0
MIN_TTL_SECONDS = 60  # Cloudflare KV's own floor for expiration_ttl

# Sentinel distinct from any real cached value (including a legitimately
# cached `None`, e.g. a memoized "not found" lookup) so callers can tell
# "nothing cached" apart from "cached the value None".
MISS = object()


def _account_id() -> Optional[str]:
    return os.getenv("CF_ACCOUNT_ID")


def _api_token() -> Optional[str]:
    return os.getenv("CF_KV_API_TOKEN")


def _namespace_id() -> Optional[str]:
    return os.getenv("CF_KV_NAMESPACE_ID")


def configured() -> bool:
    return bool(_account_id() and _api_token() and _namespace_id())


def _namespace_url() -> str:
    return f"{API_BASE}/{_account_id()}/storage/kv/namespaces/{_namespace_id()}"


def _value_url(key: str) -> str:
    return f"{_namespace_url()}/values/{urllib.parse.quote(key, safe='')}"


def _headers(extra: Optional[dict] = None) -> dict:
    headers = {"Authorization": f"Bearer {_api_token()}"}
    if extra:
        headers.update(extra)
    return headers


def get(key: str) -> Any:
    """Returns the parsed JSON value, or MISS if absent/unconfigured/erroring."""
    if not configured():
        return MISS
    try:
        req = urllib.request.Request(_value_url(key), headers=_headers(), method="GET")
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as resp:
            raw = resp.read()
        return json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError:
        # 404 = genuine miss; any other status is treated the same way —
        # fail open to "not cached" rather than surface a caching error.
        return MISS
    except Exception:
        return MISS


def set(key: str, value: Any, ttl_seconds: int) -> None:
    """Best-effort write. Silently no-ops on any failure — a cache write
    must never be allowed to break the request that triggered it."""
    if not configured():
        return
    try:
        body = json.dumps(value, default=str).encode("utf-8")
        url = f"{_value_url(key)}?expiration_ttl={max(MIN_TTL_SECONDS, int(ttl_seconds))}"
        req = urllib.request.Request(url, data=body, headers=_headers(), method="PUT")
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS):
            pass
    except Exception:
        pass


def delete(key: str) -> None:
    if not configured():
        return
    try:
        req = urllib.request.Request(_value_url(key), headers=_headers(), method="DELETE")
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS):
            pass
    except Exception:
        pass


def list_keys(prefix: str, max_pages: int = 20) -> List[str]:
    """All key names under `prefix`, paginating via Cloudflare's cursor.
    Capped at max_pages as a safety net — this only ever runs on an admin
    write, never a hot read path. Returns [] on any failure."""
    if not configured():
        return []
    names: List[str] = []
    cursor = None
    try:
        for _ in range(max_pages):
            params = {"prefix": prefix, "limit": "1000"}
            if cursor:
                params["cursor"] = cursor
            url = f"{_namespace_url()}/keys?{urllib.parse.urlencode(params)}"
            req = urllib.request.Request(url, headers=_headers(), method="GET")
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if not data.get("success"):
                break
            names.extend(item["name"] for item in data.get("result", []))
            cursor = (data.get("result_info") or {}).get("cursor")
            if not cursor:
                break
    except Exception:
        return names
    return names


def bulk_delete(keys: List[str]) -> None:
    """Best-effort bulk delete. Cloudflare's bulk endpoint caps at 10,000
    keys per call; chunked defensively well under that."""
    if not configured() or not keys:
        return
    chunk_size = 5000
    for i in range(0, len(keys), chunk_size):
        chunk = keys[i:i + chunk_size]
        try:
            body = json.dumps(chunk).encode("utf-8")
            req = urllib.request.Request(
                f"{_namespace_url()}/bulk/delete",
                data=body,
                headers=_headers({"Content-Type": "application/json"}),
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS):
                pass
        except Exception:
            pass


def purge_prefix(prefix: str) -> None:
    """Delete every key under `prefix`. Best-effort — on any failure, the
    prefix's entries simply live out their TTL instead of being purged early."""
    bulk_delete(list_keys(prefix))
