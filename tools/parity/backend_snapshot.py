"""Parity fixture for the CRM/User backend split (see Phase 0 of the split plan).

Auto-discovers every route from the running FastAPI app's OpenAPI schema and
snapshots responses for the SAFE subset only. Deliberately does NOT blindly
call every endpoint: several routers call real external services (Stripe
billing, MetaApi/CopyFactory MT5 sync, outbound email/OTP) and invoking those
with synthetic data could create real charges, real MT5 connections, or send
real emails. Those are listed separately for manual/mocked curation instead
of being auto-invoked.

Usage:
    1. Start the backend yourself against your normal dev DB
       (this script does not start/stop/manage that process):
           cd backend && uvicorn app.main:app --reload
    2. Seed known fixture data yourself (docker-compose's seed.py, or your
       own dev data) so responses are deterministic across runs.
    3. Run this script against the running instance:
           python tools/parity/backend_snapshot.py --base-url http://localhost:8000 \
               --admin-token <jwt> --user-token <jwt> --out snapshot_before.json
    4. After each migration phase, rerun with --out snapshot_after.json and
       diff the two files. They should be identical for every endpoint
       classified as SAFE; DANGEROUS/EXTERNAL endpoints must be verified
       manually (or against mocked external services) instead.

This script never seeds, migrates, or writes to any database itself, and
never starts/stops the backend process — both are left to you.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

# Routers whose write endpoints touch a real external service — never
# auto-invoked. GET endpoints in these files are still safe and included.
EXTERNAL_SERVICE_ROUTERS = {
    "billing": "Stripe checkout/webhook",
    "mt5_accounts": "MetaApi (real MT5 broker connections)",
    "copy_traders": "CopyFactory sync",
    "copy_subscriptions": "CopyFactory sync",
    "internal": "Cron/service-to-service side effects (cache purge, MetaApi/CopyFactory sync)",
    "auth": "Sends real email (OTP, password reset) on write endpoints",
}


@dataclass
class RouteResult:
    method: str
    path: str
    tags: list[str]
    status: int | None = None
    body_snippet: Any = None
    error: str | None = None


@dataclass
class Snapshot:
    safe: list[RouteResult] = field(default_factory=list)
    skipped_external: list[dict] = field(default_factory=list)
    skipped_needs_params: list[dict] = field(default_factory=list)


def classify_and_collect(openapi: dict) -> tuple[list[tuple[str, str, list[str]]], list[dict], list[dict]]:
    safe: list[tuple[str, str, list[str]]] = []
    skipped_external: list[dict] = []
    skipped_needs_params: list[dict] = []

    for path, methods in openapi.get("paths", {}).items():
        for method, spec in methods.items():
            if method.upper() not in ("GET",):
                # Only GET is auto-snapshotted. POST/PUT/PATCH/DELETE always
                # need curated payloads and are out of scope for auto-run.
                continue

            tags = spec.get("tags", [])
            router_hint = path.strip("/").split("/")[0]
            external_hit = next(
                (name for name in EXTERNAL_SERVICE_ROUTERS if name in router_hint or name in tags),
                None,
            )
            if external_hit:
                skipped_external.append({"method": method.upper(), "path": path, "reason": EXTERNAL_SERVICE_ROUTERS[external_hit]})
                continue

            # Path params (e.g. /articles/{id}) need real seeded IDs — flag
            # for manual fixture data rather than guessing an ID.
            if "{" in path:
                skipped_needs_params.append({"method": method.upper(), "path": path})
                continue

            safe.append((method.upper(), path, tags))

    return safe, skipped_external, skipped_needs_params


def run(base_url: str, admin_token: str | None, user_token: str | None) -> Snapshot:
    client = httpx.Client(base_url=base_url, timeout=15.0)
    openapi = client.get("/openapi.json").json()
    safe_routes, skipped_external, skipped_needs_params = classify_and_collect(openapi)

    snapshot = Snapshot(skipped_external=skipped_external, skipped_needs_params=skipped_needs_params)

    for method, path, tags in safe_routes:
        # Try anonymous first; if 401/403, retry with each available token
        # so both portal perspectives get captured.
        attempts = [("anonymous", {})]
        if admin_token:
            attempts.append(("admin", {"Authorization": f"Bearer {admin_token}"}))
        if user_token:
            attempts.append(("user", {"Authorization": f"Bearer {user_token}"}))

        result = RouteResult(method=method, path=path, tags=tags)
        for label, headers in attempts:
            try:
                resp = client.get(path, headers=headers)
            except httpx.HTTPError as exc:
                result.error = f"{label}: {exc}"
                continue
            if resp.status_code not in (401, 403) or label == attempts[-1][0]:
                result.status = resp.status_code
                try:
                    body = resp.json()
                except ValueError:
                    body = resp.text[:200]
                result.body_snippet = body if isinstance(body, (dict, list)) else str(body)[:200]
                break
        snapshot.safe.append(result)

    return snapshot


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--admin-token", default=None, help="JWT for a super_admin/editor/broker account")
    parser.add_argument("--user-token", default=None, help="JWT for a plain user account")
    parser.add_argument("--out", type=Path, default=Path("snapshot.json"))
    args = parser.parse_args()

    print(f"Fetching OpenAPI schema from {args.base_url} ...", file=sys.stderr)
    snapshot = run(args.base_url, args.admin_token, args.user_token)

    print(
        f"Auto-snapshotted {len(snapshot.safe)} safe GET routes. "
        f"Skipped {len(snapshot.skipped_external)} external-service routes "
        f"(review manually) and {len(snapshot.skipped_needs_params)} "
        f"path-param routes (need curated fixture IDs).",
        file=sys.stderr,
    )

    args.out.write_text(
        json.dumps(
            {
                "safe": [r.__dict__ for r in snapshot.safe],
                "skipped_external": snapshot.skipped_external,
                "skipped_needs_params": snapshot.skipped_needs_params,
            },
            indent=2,
            default=str,
        )
    )
    print(f"Wrote {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
