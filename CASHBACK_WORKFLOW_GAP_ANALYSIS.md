# CashBack-TradeVerse — Customer Journey: Implementation Gap Analysis

**Source requirement:** `CashBack-TradeVerse Requirements.xlsx` (sheet: "Customer Journey" — a single flowchart describing the visitor→customer→cashback lifecycle).
**Reviewed against:** current `main` branch (commit `3434c27`) — `backend/` (FastAPI) + `frontend/` (Next.js).
**Date:** 2026-08-28, updated 2026-08-29 with the MetaApi automated-cashback integration (see §4 — full design in `METAAPI_INTEGRATION_ARCHITECTURE.md`)
**Note:** "T.V" in the requirements sheet is short for **TradeVerse**, i.e. this project (`cbfx`) itself — not a third-party platform. "T.V's IB" / "T.V's wallet" / "T.V's referral link" below all refer to this codebase's own IB relationship, wallet, and affiliate links with each broker.

## Legend

| Status | Meaning |
|---|---|
| ✅ Done | Fully implemented and wired end-to-end |
| 🟡 Partial | Some piece exists but doesn't fully satisfy the requirement |
| ❌ Missing | Nothing implemented, or UI stub only with no backend |

---

## 1. Summary table

| # | Requirement step | Status | Key gap |
|---|---|---|---|
| 1 | Visitor enters TradeVerse website or mobile app | 🟡 Partial | Web app is real; mobile app (Capacitor/Android) is an unwired scaffold |
| 2 | Visitor goes to CashBack page | ✅ Done | `/cashback` page exists |
| 3 | Visitor clicks a Featured Broker on the home page | ✅ Done | Region-aware featured broker placements |
| 4 | Visitor clicks Sign Up / Login | ✅ Done | Login modal + `/register` page |
| 5 | Sign-up flow lets visitor pick broker(s) + MT account(s) | 🟡 Partial | Works, but doesn't lock to the one broker that was clicked |
| 6 | Visitor browses available brokers & cashback offers, picks one | ✅ Done | List page links each broker to a real offer detail page |
| 7 | Broker offer detail: account types, per-instrument cashback structure, T&Cs, payout duration/destination | ✅ Done | `/brokers/[id]` renders the full structured offer; admin fills it in via a reusable template on the broker form |
| 8 | Existing-client path: transfer account under T.V or open new account (per broker procedure) | ❌ Missing | No in-app guidance/flow for this branch |
| 9 | New-client path: register via T.V's referral link to the broker | ✅ Done | Broker's `signup_url` + UTM params, rendered as "Register with {broker}" on the offer page |
| 10 | Submit "connect MT account to CashBack" order → pending → admin approves after confirming IB link | 🟡 Partial | Adding an MT5 account is still instant with no formal pending/approve gate — **but** MetaApi now independently verifies the account is real and reachable (`metaapi_connection_status`), which is most of what "confirming the account is connected" meant. No admin action still required to unlock crediting. |
| 11 | Wallet: Available vs Current amounts | 🟡 Partial | `balance`/`lifetime_earned` still exist unchanged, but the new rebate-payout system (§4) effectively adds the missing middle state: auto-computed `expected_amount` (~"Current", pending) vs. admin-issued `actual_amount` (credited to `balance`, ~"Available") — not yet surfaced as a labeled "Current" figure on the customer-facing wallet UI |
| 12 | Wallet: per-account detail — account #, broker, **account type, server, platform**, total lots traded | ✅ Done | `account_type`, `server`, `platform` added to `MT5Account` (MetaApi provisioning, §4); total lots traded is derivable per account from `TradeRecord` rows once real sync data exists |
| 13 | Trading activity report per account | 🟡 Partial | Automated trade tracking now exists via MetaApi (`TradeRecord`, deploy→sync→undeploy, §4) — a real replacement for manual report parsing, not yet an in-app "report" view. Blocked on an external MetaApi billing setup step, not code. Manual `BrokerReport` file upload/parsing (3.3, old) is superseded by this for MetaApi-covered brokers. |
| 14 | Total withdrawn + transaction history | 🟡 Partial | Transaction history works; no "total withdrawn" aggregate |
| 15 | Withdrawal request (Crypto, Skrill, Neteller, wire transfer) | ❌ Missing | Withdraw button opens a modal that says "unavailable" |
| 16 | Fallback: full broker list if no broker chosen at signup | ✅ Done | `/brokers` listing works for this |
| 17 | Dashboard lets customer add more broker/MT accounts later | ✅ Done | "Add Account" modal on `/cashback` |

**Bottom line:** the *acquisition* side (browse → sign up → link an MT account) is largely built. The *cashback engine* itself is now real but manual-by-design: MetaApi automatically tracks trades and computes an `expected_amount` per trade (§4), but crediting a customer's wallet is a deliberate super_admin action (per user + MT5 account, via a new "Rebate Payouts" admin page) — not automatic. This was an explicit product decision (2026-08-29), not a limitation: the admin reviews the computed figure and sets what's actually credited before anything moves. What's still missing: a formal connection-approval gate (step 10), and withdrawals (step 15) remain entirely unbuilt. Live end-to-end testing of the MetaApi pipeline itself is pending an external step — adding a payment method to the MetaApi account — not app code.

---

## 2. Detailed findings

### 2.1 Entry & discovery (steps 1–4) — ✅ mostly done

- Web app: Next.js 15 app router, `frontend/app/[locale]/...`, i18n via `next-intl`.
- Home page featured brokers: `backend/app/models/broker_placement.py` + `backend/app/routers/public.py:_compute_homepage` resolve a `"featured"` section per visitor region (country override → region override → default), rendered via `frontend/components/FeaturedBrokerPanel`.
- CashBack page: `frontend/app/[locale]/(user)/cashback/page.tsx` / `CashbackClient.tsx`.
- Sign up / login: `frontend/app/[locale]/(auth)/register`, `frontend/components/LoginModal`, backed by `backend/app/routers/auth.py` with email-OTP verification (`backend/app/models/pending_registration.py`).

**Gap — mobile app:** `frontend/android/` exists (a generated Android project), but `frontend/package.json` has no `@capacitor/*` dependency and there's no `capacitor.config.ts` anywhere in the repo. It isn't wired to the current Next.js build — treat "mobile application" as **not currently shippable**, not just untested.

### 2.2 Sign-up broker selection (step 5) — 🟡 partial

`RegisterClient.tsx` lets the visitor add one or more `{broker, mt5_number}` pairs during signup (`backend/app/schemas/broker.py`, validated server-side in `pending_registration.accounts`), which covers the "optional: select broker + add MT account" part of the requirement well.

**Gap:** the requirement specifies that arriving via a **specific featured broker** should scope sign-up to *only* that broker. `FeaturedBrokerPanel` doesn't pass a `brokerId` through to the login modal or `/register`, so the visitor always sees the full broker dropdown regardless of entry point.

### 2.3 Broker offer browsing & detail (steps 6–7) — 🟡 partial / ❌ missing

- ~~`GET /public/brokers` lists a single flat `cashback_rate`; no detail page~~ — **done.** `Broker` (`backend/app/models/broker.py`) now carries a structured offer template: `account_types` (JSON — name/description/per-instrument cashback list), `terms_text`, `payout_destination` (`wallet`/`trading_account`), `payout_duration_days`, and `signup_url`. Admins fill this in once per broker via a reusable form section on `frontend/app/[locale]/admin/brokers/page.tsx` (account-type + per-instrument-rate repeater), and every future broker uses the same fields.
- `GET /public/brokers/{id}` (`backend/app/routers/public.py`) serves the full offer — account types, per-instrument rates, T&Cs, payout duration/destination, plus a `referral_url`. Rendered at `frontend/app/[locale]/(user)/brokers/[id]/BrokerDetailClient.tsx`.
- The list page (`BrokersClient.tsx`) no longer fabricates a `rating` or alternates a fake "ECN"/"Market Maker" `type` — each card now links to the real detail page and shows a genuine account-type count.

### 2.4 Existing-client / referral-link paths (steps 8–9) — 🟡 partial

- Referral link — **done.** `Broker.signup_url` (the broker's own registration page) plus `Broker.referral_id` (optional partner code) are combined by `backend/app/utils/broker_offer.py:referral_url()` into a UTM-tagged link (`?utm_source=tradeverse&utm_medium=referral&utm_campaign={broker_id}[&ref={referral_id}]`), exposed as `referral_url` on `GET /public/brokers/{id}` and rendered as "Register with {broker}" on the offer page. Resolves to `None` (button hidden, "coming soon" shown instead) until an admin sets `signup_url` for that broker.
- Still missing: no in-app content distinguishes "already a client with this broker" (transfer account under T.V's IB) from "new client" (use the referral link above) — step 8 is still an unguided manual/support process.

### 2.5 MT account connection & approval (step 10) — ❌ missing

`POST /mt5-accounts/` (`backend/app/routers/mt5_accounts.py:109`) inserts the `MT5Account` row and returns 201 immediately. There is:
- no `status` column (`pending` / `approved` / `rejected`) on `MT5Account`,
- no admin queue/page to review and approve a submitted connection,
- no verification step confirming the account is actually under T.V's IB with the broker.

This is the step the requirement is most explicit about ("it will be pending and approved from T.V side after making sure account is connected to T.V IB") and it's entirely absent — every linked account is trusted on submission.

### 2.6 Wallet (steps 11–14) — 🟡 partial

`MT5Account` (`backend/app/models/mt5_account.py`) has `balance` (withdrawable now) and `lifetime_earned` (running total ever credited). `CashbackClient.tsx` surfaces these as "Available Balance" / "Lifetime Earned" plus counts of brokers/accounts.

**Gaps:**
- The requirement's "Current" amount means *cashback calculated but not yet released for withdrawal* (e.g. pending a holding period) — that's a third state the model doesn't track at all. Today there's only "already available" and "all-time total," nothing in between.
- Per-account detail is missing **account type, broker server, and platform** (MT4 vs MT5) — the schema hardcodes "MT5" and has no fields for the other two.
- **Total lots traded** and any **trading activity report** require actual trade data, which nothing in the codebase parses or aggregates yet. `backend/app/models/` has no trade/lot model. The admin "Reports" page (`frontend/app/[locale]/admin/reports/page.tsx`) now lets an admin/broker pick a broker and upload its report file (CSV/XLSX/XLS/PDF), which is stored in R2 under `broker-reports/{broker_id}/...` and cataloged in a `BrokerReport` row (`backend/app/routers/broker_reports.py`) — this closes the storage half of the gap. What's still missing is turning an uploaded file's contents into `TradeReport` rows and `WalletTransaction` credits (see 3.3 below) — today the file just sits in the bucket unparsed. A `sample-broker-trading-report.csv` at the repo root shows the expected shape (account_number, account_type, broker_server, platform, symbol, lots_traded, trade_date, rebate_amount) for testing the upload and, later, building the parser against.
- "Total amount withdrawn" isn't computed/shown anywhere (it's derivable by summing `debit` transactions, but no endpoint or UI does this).

### 2.7 Withdrawals (step 15) — ❌ missing

`CashbackClient.tsx:244-257` — the "Withdraw" button opens a modal whose entire content is a translated string equivalent to "withdrawals are currently unavailable." There is no:
- withdrawal request endpoint (only `GET /mt5-accounts/me/transactions`, a read-only list, exists),
- payment-method model or selection UI (Crypto / Skrill / Neteller / wire transfer aren't referenced anywhere outside translation files and the mock preview strings),
- admin-side approval/processing queue for withdrawal requests.

### 2.8 Fallback & dashboard browsing (steps 16–17) — ✅ done

If a visitor skips broker selection at signup, `/brokers` (public listing) and the "Add Account" modal on `/cashback` (`AddAccountModal` in `CashbackClient.tsx`) both let them browse and connect additional broker/MT5 accounts at any time post-signup. This part matches the requirement.

---

## 3. How to implement the missing pieces

Ordered roughly by dependency (each later item builds on the one before it).

### 3.1 Broker offer detail model + page — done
`Broker` carries `account_types`, `terms_text`, `payout_destination`, `payout_duration_days`, `signup_url`; `GET /public/brokers/{id}` + `frontend/app/[locale]/(user)/brokers/[id]/` render the full offer with a UTM-tagged referral link. Admin fills the template in on the broker form. Remaining follow-up, if wanted: carry the selected broker from a homepage/featured-broker click straight into a locked choice on the offer page's CTA (currently the visitor still picks freely at sign-up — see step 5's gap).

### 3.2 MT account connection approval workflow
- ~~Add `status` (`pending`/`approved`/`rejected`) to `MT5Account`~~ — **partially superseded, see §4.** `metaapi_connection_status` (`not_connected|pending|deployed|connected|idle|error`) now gives an independent, MetaApi-verified signal of whether an account is real and reachable — most of what manual "approval" was meant to confirm.
- Still open: no formal admin `approve`/`reject` action or admin queue page exists — an account with `metaapi_connection_status == "connected"` is not blocked from anything today, it just isn't eligible for automated tracking until it reaches that state. If a hard gate is wanted (e.g. block payouts until an admin explicitly approves, on top of MetaApi's own verification), add `status`/`reviewed_by`/`reviewed_at` to `MT5Account` and an admin page, reusing the `require_roles` pattern — this is now a smaller, optional add-on rather than the primary verification mechanism.

### 3.3 Trading activity + lot-based cashback — done differently than originally planned, see §4
The original plan (parsing uploaded `BrokerReport` files into a `TradeReport` model) is superseded for any broker MetaApi can reach: `TradeRecord` rows now come from real MetaApi deal history, synced automatically once daily, not from a manually uploaded file. `account_type`/`server`/`platform` are collected at add-account time (not backfilled from a report). The `BrokerReport` upload path (`broker_reports.py`) still exists for brokers MetaApi can't connect to, but nothing parses those files yet — that gap is now secondary, not the primary path.

### 3.4 Withdrawals
- New model `WithdrawalRequest` (`mt5_account_id, amount, method` [`crypto`|`skrill`|`neteller`|`wire`], `destination_details`, `status`, `requested_at`, `processed_at`).
- `POST /wallet/withdrawals` (customer-facing, validates `amount <= balance`, creates a `pending` request and does **not** touch `balance` until approved — avoid double-spend).
- Admin queue to approve/reject; on approval, insert the corresponding `WalletTransaction(type="debit")` and decrement `balance`.
- Replace the `showWithdraw` stub modal in `CashbackClient.tsx` with a real form (amount, method picker, destination fields) wired to the new endpoint.
- Add a "Total withdrawn" stat (sum of `debit` transactions) next to the existing Available/Lifetime/Brokers/Accounts stats.

### 3.5 Sign-up broker locking + mobile app
- Lower priority / smaller: thread a `?broker=<id>` query param from `FeaturedBrokerPanel`'s click-through into the login modal and `/register`, pre-selecting and optionally locking that broker in `RegisterClient.tsx`.
- Mobile app: either add the `@capacitor/core` + `@capacitor/android` deps and a `capacitor.config.ts` to actually wire `frontend/android/` to the Next.js build, or remove the unused scaffold if mobile isn't near-term scope — worth a explicit decision either way since it's currently neither.

---

## 4. MetaApi automated cashback integration (new, 2026-08-29)

Full design in `METAAPI_INTEGRATION_ARCHITECTURE.md`. Summary of what's actually built vs. pending vs. not started:

### ✅ Done and live-tested
- **Account provisioning** — adding an MT5 account now collects server/platform/investor-password and registers it with MetaApi (`create_account`), starting deployment. Encrypted at rest (`investor_password_encrypted`, Fernet).
- **Symbol → category mapping** — admin-managed (`/admin/symbol-categories`), used to price trades by instrument category (forex/metals/commodities/crypto/indices/stocks/other).
- **Deal history sync** — `POST /internal/sync-metaapi`, called by an external cron once daily per account (deploy → fetch deals → undeploy, chosen specifically to minimize MetaApi's per-account billing — see the architecture doc for the cost math). Protected by its own auth, not user login.
- **Rebate pricing** — `TradeRecord.expected_amount` auto-computed from lots × the matching cashback rate (exact symbol override, else category, else left unpriced for admin review).
- **Rebate payouts** — **manual, super_admin-issued**, aggregated per user + MT5 account (`/admin/rebate-payouts`): admin sees the computed `expected_amount` total and trade count for an account, enters an `actual_amount` to actually credit — not required to match. This was an explicit decision to keep a human in the loop before money moves, not an automation gap.
- **"Active" user definition** — a user counts as active (for referral commission stats and the admin overview KPI) only once MetaApi has verified their account is reachable *and* it's with a broker that has real cashback pricing configured — not just "signed up" or "entered an MT5 number."
- **Cashback rate model** — reworked from a flat percentage to $/lot, matching how rebates actually get paid, with category-level rates plus per-symbol overrides.

### 🟡 Built, blocked on an external (non-code) step
Everything above is wired end-to-end in the code and has been live-tested against the real backend except the parts requiring live MetaApi infrastructure to actually deploy a trading account — that's blocked on **adding a payment method to the MetaApi account** (`app.metaapi.cloud` billing). `create_account()` itself now 403s without it. This is ops/business work, not an engineering gap — see `EXTERNAL_SETUP_TASKS.md` §4.

### ✅ Built, 2026-08-31 (phases 5–6 of the architecture doc's build order)
- **Admin visibility** — `GET /mt5-accounts/admin` + `/admin/mt5-accounts` lists every linked MT5 account with `metaapi_connection_status` and last-synced time, scoped like the existing active-count endpoint (site-wide for super_admin, own-broker-only for a `broker` role). `idle` renders as healthy, matching architecture doc §9's guidance.
- **Real copy trading (CopyFactory)** — `CopyTrader` gained a real MetaApi/CopyFactory master-account link (`is_live`, `metaapi_account_id`, `copyfactory_strategy_id`, ...), admin-provisioned via `POST /copy-traders/{id}/connect-live` and a new `/admin/copy-traders` page (which didn't exist before — curated traders previously had no admin UI at all, only the CRUD API). A new `CopySubscription` model + `/copy-subscriptions` router is the follower side: a customer subscribes one of their own MT5 accounts to a live trader, providing their **real trading password** (a deliberate, narrowly-scoped exception to this app's investor-password-only rule — see the architecture doc §8/§10 for why a read-only credential can't execute copied trades). `/copy-trading` now lists real `is_live` traders instead of the hardcoded stats array, with a subscribe flow and a "My Copy Subscriptions" section to stop copying. Requires its own continuous-deployment keep-alive cron (`POST /internal/keep-alive-copytrading`) distinct from the once-daily cashback sync — see architecture doc §10 step 6.
- **Auto-stop on lapsed subscription** — a user whose Signals + Copy Trading subscription drops out of active/trialing (Stripe webhook, or the daily `/internal/sync-subscriptions` reconciliation as a safety net) has any running copy subscriptions automatically stopped — same teardown a user gets from stopping one themselves.
- Blocked on the same external MetaApi billing setup as phases 1–4 for live end-to-end testing (see below) — built and wired, auth/validation paths exercised, live CopyFactory calls unverified.

### ❌ Not started
- **Manual `BrokerReport` parsing** — still just stored, unparsed, for brokers MetaApi can't reach.

---

## 5. What's already solid (don't rebuild)

- Region-aware content resolution (brokers, featured placements, ad banners, SEO) via `detect_region`/`_visible_to_visitor` in `public.py` — reuse this pattern for the broker detail endpoint.
- Email-OTP signup with pending-registration staging (`pending_registration.py`) — no changes needed for the cashback workflow.
- `require_roles` authorization pattern used consistently across `brokers.py`, `referrals.py`, `mt5_accounts.py` — reuse for the new admin approval/withdrawal endpoints.
- `WalletTransaction` ledger shape (`credit`/`debit`, amount always positive) is a sound foundation — extend it rather than replacing it.
