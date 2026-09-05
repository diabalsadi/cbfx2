# MetaApi Integration — Architecture

**Goal:** automatically pull each user's MT4/MT5 trading activity (lots traded, per instrument, per account) via MetaApi, so cashback rebates can be calculated and credited without an admin manually uploading and parsing broker report files.

**Status:** planning — nothing in this doc is built yet. See `CASHBACK_WORKFLOW_GAP_ANALYSIS.md` §3.3 for how this closes that gap, and `METAAPI_VS_DUPLIKIUM_COMPARISON` (chat, not yet a file) for why MetaApi over trade-copier.com.

**All open decisions below are now resolved** (see §11) — rates are $/lot, set per instrument **category** (forex/metals/commodities/crypto/…) with an optional per-symbol override, customer-facing only (no wholesale-margin tracking in-app), synced via an external cron hitting a protected endpoint, and forward-only (no backfill) for accounts that predate this integration. Accounts not used for copy trading are **deployed only for the duration of a sync**, not left connected 24/7 — see §4. Rebate payouts are **manual, super_admin-issued, aggregated per user + MT5 account** — an auto-computed `expected_amount` is a reference only; nothing credits until an admin sets an `actual_amount` (reversed 2026-08-29 from the original "immediate, no holding period" decision — see §6).

**Phases 1–4 are built.** Phase 1 (account provisioning) and Phase 2 (`SymbolCategory` admin CRUD) are live-tested against the real backend. Phase 3 (`TradeRecord` model + `POST /internal/sync-metaapi`, deploy→fetch→undeploy) has its auth, due-account query, and error-handling paths live-tested; the actual deploy/fetch/undeploy happy path is still blocked on the same MetaApi billing requirement — `create_account()` itself now also 403s ("please top up your account" / "high reliability", regardless of the `reliability: "regular"` fix), not just `deploy()`. Phase 4 (rebate calculation) is built and wired into the same endpoint, with its rate-resolution precedence (exact symbol overrides category) unit-tested directly. **Reworked 2026-08-29:** pricing (`expected_amount`) stays automatic, but crediting is now a separate manual super_admin action via the new `RebatePayout` model + `/admin/rebate-payouts` page (see §6) — the user's explicit call, reversing the original "immediate, no holding period" decision. End-to-end payout flow is unverified for the same billing-blocked reason — there are no real `TradeRecord` rows yet to price. Phases 5–6 are still planning-only.

---

## 1. Where this plugs into what already exists

| Existing piece | Role in this integration |
|---|---|
| `MT5Account` (`backend/app/models/mt5_account.py`) — `user_email, broker_id, mt5_number, balance, lifetime_earned` | The account we need trade data *for*. Gets new fields (§3). |
| `WalletTransaction` (`backend/app/models/wallet_transaction.py`) — `type (credit/debit), amount, description` | Where a calculated rebate ends up — `type="credit"` rows, same ledger the wallet page already reads. |
| `Broker.account_types[].cashback` (`backend/app/models/broker.py`) — `[{symbol, rate}]` per account type | The rebate **rate table** — already admin-editable per broker, per account type, per instrument. Needs a units fix (§5). |
| `BrokerReport` (`backend/app/models/broker_report.py`) — manual file upload, catalogued but never parsed | The **manual/fallback path** for brokers with no MetaApi-compatible feed. Should converge on the same rebate-calculation step as the MetaApi path (§6), not be a second parallel system. |

Everything new in this doc is additive — no existing model loses a field, no existing endpoint's contract changes.

---

## 2. High-level flow

```
User adds MT5 account (existing POST /mt5-accounts/)
        │
        ▼
Collect MetaApi-required fields: login (existing mt5_number), server,
platform, investor password ── NEW, see §3
        │
        ▼
api.metatrader_account_api.create_account({
  name, type: "cloud", login, password, server, platform,
  reliability: "high",
})                                          ── SDK call, see §3
        │
        ▼
account.deploy()                            ── SDK call
        │
        ▼
Account status: not_connected → pending → deployed → connected
(poll account.state / account.connection_status until "connected")
        │
        ▼
Pull deal/trade history (scheduled job, §4) — only possible once "connected"
        │
        ▼
Store raw deals in TradeRecord (NEW model, §5) — idempotent on deal id
        │
        ▼
Rebate calculation job: TradeRecord × Broker.account_types[].cashback → amount
        │
        ▼
WalletTransaction(type="credit") + bump MT5Account.lifetime_earned
        │
        ▼
account.undeploy() — stop billing until the next 6-hour cycle (§4), repeat
```

---

## 3. New/changed fields on `MT5Account`

Already flagged as missing in the gap analysis (item 3.3) — this integration is what actually needs them:

```python
account_type = Column(String, nullable=True)      # e.g. "Standard", "Razor" — matches a Broker.account_types[].name
server = Column(String, nullable=True)             # MT4/5 server name, e.g. "ICMarketsSC-Live05" — required by MetaApi provisioning
platform = Column(String, nullable=True)           # "mt4" | "mt5" — required by MetaApi provisioning
investor_password_encrypted = Column(String, nullable=True)  # NEVER the trading password — see §7, §8
metaapi_account_id = Column(String, nullable=True, index=True)  # MetaApi's own account id, once provisioned
metaapi_connection_status = Column(String, nullable=False, default="not_connected")
# "not_connected" | "pending" | "deployed" | "connected" | "error"
metaapi_last_synced_at = Column(DateTime(timezone=True), nullable=True)
```

**Collection point:** the existing "Add Account" flow (`AddAccountModal` in `CashbackClient.tsx`, and the sign-up flow's account draft in `RegisterClient.tsx`) needs three new fields — server, platform, investor password — alongside the broker picker and MT5 number that are already there. `account_type` should be a dropdown sourced from the selected broker's `account_types[].name` (already admin-configured, per the broker offer template work) rather than free text.

Confirmed against MetaApi's actual account-registration API — it takes exactly four identifying fields: `login` (our existing `mt5_number`), `server`, `platform`, `password`. **The `password` field must only ever be the investor (read-only) password** — MetaApi's API will technically accept the main trading password too, but there's no legitimate reason to ever collect it, and the form needs to say so explicitly (e.g. *"Use your investor/read-only password, not your main login password"*, shown on the field itself) — customers won't reliably know the difference otherwise, and a mistaken master password landing on our servers is exactly the failure mode §8's security section exists to prevent. Every MT5 platform has an investor password as a standard terminal feature, so this isn't asking for anything unusual.

**Provisioning profiles:** most brokers are already in MetaApi's broker database and connect from `server` + `login` alone. A minority of smaller/newer brokers need a **provisioning profile** (broker-specific server files) configured once, ahead of time, in `app.metaapi.cloud` → Provisioning Profiles. There's no way to know in advance which category a given broker falls into — it only shows up as a failed connection attempt for that broker's accounts, at which point a provisioning profile needs to be added for it. Worth checking each broker cbfx already partners with with a test/demo account before their customers start connecting real ones.

---

## 4. Sync mechanism

MetaApi offers both a streaming WebSocket API and REST polling. For rebate purposes, near-real-time isn't a requirement — a scheduled poll is simpler, cheaper to reason about, and matches this app's existing pattern (no background job runner exists yet; the Cloudflare KV work added the first piece of "scheduled" behavior, but only for cache expiry, not app logic).

**Recommendation: polling, not streaming**, at least for v1.
- A periodic job calls MetaApi's deal-history endpoint per account, filtered to `startTime` = last successful sync.
- Streaming can be added later if near-real-time crediting becomes a product requirement — it's a bigger lift (persistent WebSocket connections per account, reconnect/backoff handling) for a benefit (minutes of latency) this feature doesn't obviously need. It would also be needed for real CopyFactory-based copy trading (§10 step 6) — a copied account has to stay deployed and connected to actually mirror trades, not just to be read from periodically.

**Where the job runs — decided:** an external cron hits a new, protected `POST /internal/sync-metaapi` endpoint, authenticated via a header checked against `METAAPI_SYNC_KEY`/`METAAPI_SYNC_SECRET` (new env vars, generated and added to `.env`). The `META_ACCOUNT_ID`/`META_SERVER`/`META_ACCOUNT_PASSWORD` values already in `.env` are confirmed leftover/test data — unrelated, safe to ignore. **Correction:** `TRADE_SYNC_KEY`/`TRADE_SYNC_SECRET` were *not* reserved for this, despite earlier assumption in this doc — stale compiled bytecode (`__pycache__/tradesync.*.pyc`, dated 2026-08-22, no `.py` source and never committed) revealed they were credentials for a since-abandoned prototype integration with a *different* third-party API, "TradeSync" (`api.tradesync.com`), used as outbound HTTP Basic auth via a `TradeSyncClient` — the opposite direction from what this endpoint needs (verifying an *inbound* header). Confirmed abandoned; left untouched, not reused.

No in-app scheduler needed — this keeps the FastAPI process itself simple and matches how the `.env` was apparently already anticipating this shape.

### Deploy cadence — decided: deploy-sync-undeploy once daily, not every 6 hours

MetaApi's own FAQ confirms billing is metered per deploy cycle with a **6-hour minimum charge each time an account is deployed**, and no charge while undeployed ([source](https://metaapi.cloud/docs/client/faq/)). This means **cycling at exactly the 6-hour minimum saves nothing** — four 6-hour blocks back-to-back with no gap bills identically to staying deployed continuously (four blocks/day either way). The saving only materializes when the gap between deploys is *meaningfully longer* than 6 hours, so fewer of the day's four possible blocks actually get consumed. Since rebate tracking only needs periodic deal history — not live streaming — the sync job should default to **once-daily** deploys for every account not used for real copy trading (§10 step 6 is the only feature that would need a persistent connection):

```
Each sync cycle (default cadence: once per day — 1 of 4 possible 6h blocks/day):
    account.deploy()                                    # reuses the stored metaapi_account_id — never re-creates
    account.wait_connected()
    connection = account.get_rpc_connection()
    connection.connect()
    connection.wait_synchronized()
    deals = connection.get_deals_by_time_range(last_synced_at, now)
    connection.close()
    → upsert into TradeRecord (§5), idempotent on metaapi_deal_id
    account.undeploy()                                  # stop billing until the next cycle
    mt5_account.metaapi_last_synced_at = now
```

**Real pricing, from MetaApi's cost calculator (confirmed 2026-08-28):** deployed hosting $0.08/account/mo, trading account deployment $2.16/account/mo, CopyFactory API $0.01/account/mo (not needed here — no real copy trading), MetaApi API $0 — **$2.24–2.26/account/mo at continuous (4 blocks/day) deployment.** Approximating linearly by block-count/day (MetaApi doesn't publish the exact proration, so treat this as an estimate, not a quote):

| Cadence | Blocks/day | Cost/account/mo | 1,000 accounts/mo |
|---|---|---|---|
| Every 6h *(rejected — ties with always-on)* | 4 of 4 | ~$2.24 | ~$2,240 |
| Every 12h | 2 of 4 | ~$1.12 | ~$1,120 |
| **Once daily (default)** | 1 of 4 | ~$0.56 | ~$560 |
| Every 2 days | 1 of 8 | ~$0.28 | ~$280 |

Trade-off: once-daily means rebate crediting can lag up to ~24h behind the actual trade. That's an acceptable v1 trade-off given §6's rebate calc already runs as a decoupled pass over unprocessed `TradeRecord` rows, not something requiring minute-level freshness. Revisit toward every-12h (2x the cost) if same-day crediting becomes a product requirement later.

`metaapi_connection_status` gets one more value for this: **`"idle"`** — successfully connected at least once, currently undeployed by design between cycles (distinct from `"not_connected"`, which means never successfully provisioned/connected at all). Updated vocabulary: `"not_connected" | "pending" | "deployed" | "connected" | "idle" | "error"`.

`provision_account()` (Phase 1, already built) already stores `metaapi_account_id` even when `deploy()` fails, specifically so a later cycle can call `deploy()` again on the same MetaApi-side account instead of creating a duplicate — this cadence is exactly why that mattered. Phase 1's `create_account()` call also now requests `"reliability": "regular"` instead of MetaApi's default `"high"`, which bills as 2x a standard resource slot — redundant infra isn't needed for a once-daily polling connection.

---

## 5. New model: `TradeRecord`

One row per closed deal, pulled from MetaApi's deal history.

```python
class TradeRecord(Base):
    __tablename__ = "trade_records"
    __table_args__ = (
        UniqueConstraint("mt5_account_id", "metaapi_deal_id", name="uq_trade_record_account_deal"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mt5_account_id = Column(String, ForeignKey("mt5_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    metaapi_deal_id = Column(String, nullable=False)   # MetaApi's deal id — the idempotency key
    symbol = Column(String, nullable=False)
    lots = Column(Float, nullable=False)
    direction = Column(String, nullable=True)           # "buy" | "sell"
    opened_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=False)
    profit = Column(Float, nullable=True)                # informational, not used for rebate math
    expected_amount = Column(Float, nullable=True)        # auto-computed projection, null until priced — see §6
    payout_id = Column(String, ForeignKey("rebate_payouts.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

The `UniqueConstraint` is what makes repeated polling safe — re-fetching a deal that's already stored is a no-op, not a duplicate.

### Rate model — resolved

`Broker.account_types[].cashback` was `[{symbol, rate}]` with `rate` documented as a percentage. Decided: rates are **$ per lot**, set primarily **per instrument category** (forex/metals/commodities/crypto/…), with an optional exact-symbol override for brokers that price one symbol differently from its category. Customer-facing only — no wholesale/broker-side rate is tracked in-app; T.V's margin against what the broker actually pays stays outside the system.

Revised shape (`backend/app/schemas/broker.py:InstrumentCashback`):

```python
class InstrumentCashback(BaseModel):
    category: Optional[str] = None   # "forex" | "metals" | "commodities" | "crypto" | "indices" | ...
    symbol: Optional[str] = None     # exact override, e.g. "EURUSD" — wins over a category match when both exist
    rate: float                       # $ per lot
    # exactly one of category/symbol must be set — validated in the schema
```

Resolution order when pricing a `TradeRecord`: exact `symbol` match first, else the traded symbol's `category` match, else unpriced (flagged for admin review, not silently defaulted to `Broker.cashback_rate` — that field is a separate, already-shipped **headline marketing %** shown on broker list/detail cards, e.g. "up to 85% cashback," and isn't compatible with $/lot math. This integration doesn't touch `cashback_rate` at all.

**New requirement this surfaces:** resolving "category" for a category-level match needs a **symbol → category lookup**, which doesn't exist server-side today (`frontend/helpers/tradingviewSymbols.ts` has something adjacent client-side, for a different purpose — display grouping, not pricing). `TradeRecord.symbol` arrives from MetaApi as the broker's raw MT5 symbol string (e.g. `"EURUSD"`, `"XAUUSDm"`, broker-suffix variants included), which then needs mapping to one of the fixed category values admins pick from in the broker form. Resolved as **admin-editable** (§11 #7) rather than a hardcoded table — see the `SymbolCategory` model there. This is Phase 2 in §10, not something MetaApi provides for you.

---

## 6. Rebate calculation step

**Payout timing — reversed 2026-08-29** (was: immediate auto-credit, no holding period — see the struck-through §11 #4 history below). The auto-calculated figure is now **`expected_amount`, a projection that never touches the wallet on its own.** Crediting is a deliberate, manual super_admin action, aggregated **per user + MT5 account**, via a new `RebatePayout` model — not per trade, and not automatic. Two separate steps:

**Step 1 — pricing (`calculate_rebates()`), still automatic, runs after each sync batch:**

```
for each TradeRecord where expected_amount IS NULL:
    account_type = mt5_account.account_type
    broker_account_type = broker.account_types matching account_type
    category = symbol_to_category(trade_record.symbol)  # new lookup, see §5
    rate = broker_account_type.cashback matching symbol, else matching category, else None
    if rate is None:
        skip — flag for admin review, do not guess
    trade_record.expected_amount = trade_record.lots * rate
    # No WalletTransaction, no balance change here — expected_amount is a
    # reference figure only.
```

**Step 2 — payout (`create_rebate_payout()`), manual, super_admin-only, via the admin "Rebate Payouts" page:**

```
admin picks an MT5 account with pending priced trades (expected_amount set, payout_id still null)
admin sees: sum(expected_amount) across those trades, and how many trades
admin enters actual_amount — not required to match expected_amount
→ create RebatePayout(mt5_account_id, expected_amount=sum, actual_amount, trade_count, note, created_by=admin)
→ mark every included TradeRecord.payout_id = payout.id  (settles them — excluded from future aggregation)
→ create WalletTransaction(type="credit", amount=actual_amount, description=f"Cashback payout · {trade_count} trades")
→ mt5_account.balance += actual_amount
→ mt5_account.lifetime_earned += actual_amount
```

New model `RebatePayout` (`backend/app/models/rebate_payout.py`):

```python
class RebatePayout(Base):
    __tablename__ = "rebate_payouts"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mt5_account_id = Column(String, ForeignKey("mt5_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    expected_amount = Column(Float, nullable=False)   # sum of settled trades' expected_amount, for reference
    actual_amount = Column(Float, nullable=False)      # what was actually credited — admin's call
    trade_count = Column(Integer, nullable=False)
    note = Column(String, nullable=True)
    created_by = Column(String, ForeignKey("users.email", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

Admin UI: `GET /rebate-payouts/pending` (super_admin-only) lists every account with unsettled priced trades — user, broker, MT5 number, trade count, `expected_amount`. `POST /rebate-payouts` issues a payout for one account. Frontend page: `/admin/rebate-payouts` (nav-gated `super_admin` only, matching the router).

---

## 7. Credentials — two different kinds, don't conflate them

**1. Our platform credential (one, ours, get it once).** The MetaApi API token authenticates *our backend* to MetaApi as a whole — a single token, sent as an `auth-token` header, covering the trading account API, MetaStats, and CopyFactory together (confirmed against MetaApi's own auth docs — no separate token per product for a server-to-server integration like this one).

To get it:
1. Sign up at `app.metaapi.cloud` (if not already done — see `EXTERNAL_SETUP_TASKS.md` §4)
2. Log in, go to `app.metaapi.cloud/token`
3. Generate a token — copy it immediately, most platforms like this only show the full value once
4. This becomes `METAAPI_TOKEN` in `backend/.env` (the real one, never `.env.example`) — server-side only, never sent to the frontend

MetaApi also supports generating a narrower, scoped-down token (read-only, limited to specific accounts) via a token-narrowing API, for cases where a token might reach a browser. Not needed here — everything in this integration is backend-to-backend, so the plain admin token from step 3 is sufficient.

**2. Per-customer MT5 credentials (many, collected from customers, not "gotten" from MetaApi).** These aren't retrieved from MetaApi's dashboard at all — they're what each customer provides when connecting their own trading account, and *we* hand them to MetaApi to provision that specific account (§2, §3):

| Field | Source |
|---|---|
| `login` | Customer's MT5 account number — already collected today (`mt5_number`) |
| `server` | Customer's broker's MT5 server name — new field |
| `platform` | `"mt4"` or `"mt5"` — new field |
| `password` | Customer's **investor (read-only)** password — new field, never their trading password |

Nothing in this second category comes from us or from MetaApi — it only exists inside each customer's own MT4/5 terminal (investor password is a standard MT4/5 feature, set under the terminal's own account settings, separate from the trading password).

---

## 8. Security

- **Never collect or store the MT4/5 trading (master) password.** MetaApi — and this integration — only needs the **investor (read-only) password**, which cannot place trades or withdraw funds. This should be explicit in the UI copy wherever the password is collected, not just in code comments.
- Store `investor_password_encrypted` encrypted at rest (not hashed — MetaApi needs the plaintext to provision the account, so this must be reversible encryption, e.g. via a KMS-backed key or at minimum `cryptography.fernet` with a key from an env var never committed to git).
- The `METAAPI_TOKEN` (§7) is server-side only. The existing `META_ACCOUNT_ID`/`META_SERVER`/`META_ACCOUNT_PASSWORD` in `.env` are confirmed leftover/test data, unrelated to this integration — don't reuse them.

---

## 9. Admin visibility

Ties into gap-analysis item 3.2 (account approval workflow) — `metaapi_connection_status` gives the admin queue something concrete to show beyond "pending": *why* it's pending (not yet provisioned vs. provisioned but MetaApi reports a connection error, e.g. wrong investor password or server name). An admin approval step should probably require the status to be (or to have ever reached) `"connected"` before flipping the account to approved — i.e., don't just trust the admin's eyeball, let MetaApi's own successful connection be part of the verification that "this account is genuinely reachable." Once deploy-sync-undeploy cycling (§4) is live, `"idle"` between cycles is the expected steady state for a healthy, approved account — the admin UI should treat `"idle"` as healthy, not as a problem to flag, and reserve attention for `"error"`.

---

## 10. Phased build order

1. ✅ **Account provisioning** — new MT5Account fields, MetaApi SDK/client wrapper, create+deploy call on account add, status polling until `connected`. Record `metaapi_connection_status` transition timestamps — the moment it first reaches `connected` is the sync start point (§11, forward-only). **Built and live-tested** — `create_account()` reaches real MetaApi infrastructure; `deploy()` (and, as of the latest test, `create_account()` itself) is blocked on MetaApi billing setup, not a code issue.
2. ✅ **Symbol → category mapping** — `SymbolCategory` model + admin CRUD page (§11 #7). Small, self-contained, needed before step 4 can price anything. **Built and live-tested.**
3. ✅ **Deal history sync job** — `TradeRecord` model, the `/internal/sync-metaapi` endpoint + external cron on a once-daily cadence, doing deploy→fetch→undeploy per account each run (§4). Each account's first sync pulls deals from its `connected` timestamp forward only, never earlier. **Built**; auth + due-account query + per-account error handling live-tested, but the actual deploy/fetch/undeploy path is untested pending MetaApi billing.
4. ✅ **Rebate calculation** — the §6 pipeline, reworked 2026-08-29: category/symbol rate resolution → `TradeRecord.expected_amount` (projection only). Actual crediting is a separate, manual super_admin step via the new `RebatePayout` model + `/admin/rebate-payouts` page — aggregated per user + MT5 account, admin-entered `actual_amount`. **Built and live-tested** (auth, empty-state, and the still-zero pricing pass via `/internal/sync-metaapi`); the full priced-trade → payout flow is unverified end-to-end (no real trade data yet — same billing blocker).
5. ✅ **Admin visibility** — `GET /mt5-accounts/admin` + `/admin/mt5-accounts` surfaces `metaapi_connection_status` and last-synced time for every account (site-wide for super_admin, own-broker-only for `broker`). **Built**, 2026-08-31.
6. ✅ **CopyFactory** — real automated copy trading, reusing the account-provisioning plumbing from step 1. `CopyTrader` gained an admin-provisioned master MetaApi/CopyFactory link (`POST /copy-traders/{id}/connect-live`, new `/admin/copy-traders` page); a new `CopySubscription` model + `/copy-subscriptions` router is the follower side, requiring the customer's real trading password (not the investor password used elsewhere — CopyFactory has to place trades on a subscriber's account, which a read-only credential can't do) via an explicit opt-in flow. `/copy-trading` lists real `is_live` traders and lets a customer subscribe/unsubscribe. Needs its own continuous-deployment keep-alive cron (`POST /internal/keep-alive-copytrading`, more frequent than the once-daily `/sync-metaapi`) since CopyFactory mirrors trades live rather than on a poll — see step 8 below. A lapsed/unrenewed Signals + Copy Trading subscription auto-stops any running copy subscriptions (webhook-driven, plus the daily `/internal/sync-subscriptions` reconciliation as a safety net). **Built**, 2026-08-31 — blocked on the same MetaApi billing setup as steps 1–4 for live end-to-end verification.

Steps 1–4 are the minimum for the actual ask ("calculate the rebate"). 5 and 6 are natural extensions, not prerequisites.

---

## 11. Decisions made

| # | Question | Decision |
|---|---|---|
| 1 | Rate units | **$ per lot**, admin-entered. Customer-facing only — no wholesale/broker margin tracked in-app. |
| 2 | Rate granularity | **Per category** (forex/metals/commodities/crypto/…), with an optional exact-symbol override for exceptions. |
| 3 | Background job | **External cron** hitting a protected `/internal/sync-metaapi` endpoint, authenticated via `METAAPI_SYNC_KEY`/`METAAPI_SYNC_SECRET` (fresh env vars — `TRADE_SYNC_KEY`/`TRADE_SYNC_SECRET` turned out to belong to an abandoned, unrelated "TradeSync" API prototype, not this endpoint; see §4). |
| 4 | Payout timing | ~~Immediate — straight to `balance`, no holding period.~~ **Reversed 2026-08-29:** `expected_amount` auto-computes per trade but never auto-credits. Crediting is a manual super_admin action via `RebatePayout`, aggregated per user + MT5 account, with an admin-entered `actual_amount` that isn't required to match `expected_amount`. See §6. |
| 5 | Historical backfill | **Forward-only** — sync starts from each account's own `connected` timestamp, no retroactive crediting for older trades. |
| 6 | `META_ACCOUNT_ID`/`META_SERVER`/`META_ACCOUNT_PASSWORD` in `.env` | **Leftover/test data** — unrelated, ignored. `TRADE_SYNC_KEY`/`TRADE_SYNC_SECRET` are similarly unrelated (abandoned "TradeSync" API prototype, see §4) — also left alone. This integration uses its own new `METAAPI_TOKEN` and `METAAPI_SYNC_KEY`/`METAAPI_SYNC_SECRET`. |
| 7 | Symbol → category lookup source of truth | **Admin-editable from day one** — not a static code table. New model + admin screen (below), not a code deploy per new symbol. |
| 8 | Deploy cadence | **Deploy → sync → undeploy once daily** per account (not used for real copy trading) — cycling at exactly the 6-hour billing minimum (as originally considered) ties with always-on cost, since 4 back-to-back blocks/day = the same 4 blocks/day as staying deployed; once-daily uses only 1 of 4, ~4x cheaper (~$560/mo vs ~$2,240/mo at 1,000 accounts, per real MetaApi pricing in §4). Real-time copy trading (§10 step 6), if ever built, is the one case that needs an account to stay deployed/connected continuously instead. |

No open questions remain — every item below is now build-ready.

### New model this adds: `SymbolCategory`

```python
class SymbolCategory(Base):
    __tablename__ = "symbol_categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Canonical symbol, broker-suffix normalized before lookup (e.g. "XAUUSDm" -> "XAUUSD").
    symbol = Column(String, nullable=False, unique=True, index=True)
    category = Column(String, nullable=False)  # "forex" | "metals" | "commodities" | "crypto" | "indices" | ...
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

Simple CRUD router (`super_admin` only, same `require_roles` pattern as everything else) + a small admin page (list + add/edit/delete, one row per symbol) — the same shape as the SEO route registry or ad-banner region overrides already in the admin panel, not a new UI pattern. Lookup miss (a traded symbol with no row here) behaves the same as an unpriced trade in §6 — flagged for admin review, not guessed at.

This becomes part of Phase 2 in §10 (renamed from "lookup" to "admin-managed mapping," same slot in the build order — still needed before Phase 4's rebate pricing, just with a small model/router/UI instead of a hardcoded table).
