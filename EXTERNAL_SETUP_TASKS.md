# External Setup Tasks — Things Outside The Codebase

These are the tasks that **aren't code** — accounts, agreements, and credentials with outside companies —
needed before the remaining CashBack features (see `CASHBACK_WORKFLOW_GAP_ANALYSIS.md` /
`CashBack-TradeVerse-Status-Report.pdf`) can go fully live. None of this can be sped up by more engineering
time; it's business/ops work with third parties, and engineering is blocked on its output.

Owner for every section below: **business/ops**, not engineering. Each section ends with what to hand to
engineering once it's done.

---

## 1. Broker trading data (needed for: lots-traded tracking, earnings/activity reports)

Cashback can only be calculated automatically once we actually receive each broker's trading activity for our
referred accounts.

**Steps:**
1. For each broker we partner with, contact their IB/affiliate manager and ask what reporting options they offer:
   - A live API we can pull trade data from, or
   - A scheduled report (CSV/Excel) delivered by email or a partner portal, daily/weekly
2. Get a **sample report or API response** from each broker — we need to see the actual fields they provide
   (lots traded, account number, instrument, open/close dates, rebate amount, etc.)
3. Confirm the **reporting frequency** (real-time, daily, weekly) and any **delay** before data is available
4. Confirm whether the report is **per-account** or a **bulk file covering all our referred accounts** at that broker
5. If it's a manual file (not an API): agree who is responsible for downloading it regularly and get login
   access to the broker's partner/IB portal
6. Repeat for every broker on the platform — this is a per-broker task, not a one-time setup

**Hand to engineering:** sample files/API docs + credentials or portal access for each broker, plus the agreed
delivery method and frequency.

---

## 2. Payment methods for withdrawals

The requirements call for four payout methods: **Crypto, Skrill, Neteller, and wire transfer.** Each needs its
own business account before it can be wired into the app.

### 2a. Crypto
1. Choose a crypto payment/payout provider (e.g. a custodial payout processor, or an exchange with a payout API)
2. Register a business account and complete their KYB (Know Your Business) verification
3. Decide which currencies/networks to support (e.g. USDT on Tron vs. Ethereum — fees and speed differ a lot)
4. Fund a hot wallet/payout balance the provider can pay out from
5. Get **sandbox/test API credentials** first, then **live API credentials**

### 2b. Skrill
1. Open a Skrill **Business/Merchant** account (not a personal account)
2. Complete business verification (company documents, ID checks)
3. Apply for API/mass-payout access (Skrill calls this their payout API) — this may need a separate approval
4. Get sandbox credentials for testing, then live credentials

### 2c. Neteller
1. Same process as Skrill (Neteller and Skrill are both owned by Paysafe) — open a Neteller **Merchant**
   account and apply for their payout API
2. Complete business verification
3. Get sandbox credentials, then live credentials

### 2d. Wire transfer
1. Confirm which business bank account payouts will be sent from
2. Decide if wires are sent manually by finance/ops (no API needed) or through a banking API/payment
   platform (e.g. Wise Business, Payoneer) for semi-automated payouts
3. If using a banking API: register the business account with that provider and get API credentials
4. Agree on internal approval steps for wire payouts (who signs off before money moves)

### 2e. Compliance (applies to all four methods)
1. Confirm what KYC/AML checks are required on **our customers** before they can withdraw (e.g. ID
   verification threshold, minimum withdrawal amount, sanctions screening)
2. Confirm regulatory requirements for payouts in each country we operate in
3. Document a withdrawal approval process (who at the company approves payouts, and any limits)

**Hand to engineering:** API credentials (sandbox + live) for each provider we're enabling at launch, the
approved KYC/AML rules to enforce, and the internal approval process to build into the admin workflow.

---

## 3. Referral links to brokers

1. For each broker, get their **actual sign-up/registration URL** (not just an affiliate ID/code)
2. Confirm with each broker whether they require a specific tracking parameter format (some brokers use
   their own `?ref=` or `?ib=` style parameter instead of standard UTM tags) — get their exact required format
3. Test each link end-to-end with the broker to confirm a sign-up through it is correctly attributed to us

**Hand to engineering:** the confirmed sign-up URL + required tracking parameter format for every broker.

---

## 4. MetaApi account (needed for: automated lots-traded tracking → rebate calculation)

Replaces manual broker-report parsing (Section 1) with automated MT4/MT5 trade data — see
`METAAPI_INTEGRATION_ARCHITECTURE.md` for the full design. This section is just the account setup;
engineering builds everything downstream of the token.

1. Sign up at `app.metaapi.cloud`
2. Generate an API token at `app.metaapi.cloud/token`
3. Check the billing/pricing section for current per-account tiers once you have a rough estimate of how
   many customer MT5 accounts you expect connected — cost scales with connected accounts, not usage
4. Optional but recommended: add one **demo** MT5 account manually via `app.metaapi.cloud/accounts`, using
   its **investor (read-only) password only** — confirms the connection actually works before engineering
   automates this for real users. Never use a live account or a main trading password for this test.

**Hand to engineering:** the API token (becomes `METAAPI_TOKEN` in `backend/.env`).

---

## 5. Stripe account (needed for: the Signals + Copy Trading subscription paywall)

One combined monthly subscription unlocks both the Signals and Copy Trading pages (blurred + a
"Subscribe" button until purchased) — see `backend/app/services/stripe_client.py` and
`frontend/components/ProGate` for the built integration. This section is just the account/product setup;
engineering builds everything downstream of the keys.

1. Create a Stripe account at `dashboard.stripe.com` (or use an existing one)
2. In test mode first: **Products** → create one product, e.g. "CBFX Pro" — add a single **recurring,
   monthly Price of $25 USD** (decided price — this is what the frontend's subscribe card displays, so keep
   them in sync if it ever changes). Don't create separate products for future tiers here; a monthly/annual
   toggle would be a second Price on this same product, not a new product.
3. **Developers → API keys** → generate a **restricted key** (`rk_...`), scoped to only: Checkout Sessions
   (write), Customers (write), Subscriptions (read) — avoid handing engineering a full secret key
4. **Developers → Webhooks** → add an endpoint pointing at `https://<your-api-domain>/billing/webhook`,
   subscribed to at least: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted` — copy the endpoint's **signing secret**
5. Decide on trial/cancellation policy (free trial days, proration on cancel) — configurable on the Price/
   subscription settings, not hardcoded by engineering
6. Once ready for real payments: repeat steps 2–4 in **live mode** (Stripe keeps test and live completely
   separate) and swap the keys
7. Consider whether Stripe Tax should be enabled for the jurisdictions being charged — a separate setup
   step in the Stripe dashboard, not automatic

**Hand to engineering:** the restricted API key (`STRIPE_SECRET_KEY`), the webhook signing secret
(`STRIPE_WEBHOOK_SECRET`), and the monthly Price ID (`STRIPE_PRICE_ID`) — all three go in `backend/.env`.

---

## 6. Mobile app (if launching soon)

1. Decide whether the mobile app is in scope for the near-term roadmap (it isn't wired up today)
2. If yes: register a **Google Play Developer account** (one-time fee) and, if iOS is also wanted, an
   **Apple Developer account** (annual fee)
3. Prepare store listing assets (app icon, screenshots, description, privacy policy URL)
4. Confirm app store review requirements around handling money/cashback (both stores have extra scrutiny
   for finance-related apps)

**Hand to engineering:** developer account access and store listing assets.

---

## 7. Priority order

If ops time is limited, tackle these in this order — each unblocks a specific pending feature:

1. **Referral links (Section 3)** — fastest to get, unblocks the broker offer page and referral flow immediately
2. **One payment method, end-to-end (Section 2)** — pick just one (commonly wire transfer, since it can start
   fully manual with no API) to get *a* working withdrawal path live, then add the rest later
3. **MetaApi account (Section 4)** — automates rebate calculation, the actual core of the product
4. **Stripe account (Section 5)** — unblocks the already-built Signals/Copy Trading paywall; can happen in
   parallel with MetaApi since it's unrelated
5. **Broker trading data (Section 1)** — only needed for brokers MetaApi can't reach; otherwise superseded by Section 4
6. **Remaining payment methods** — add Skrill/Neteller/Crypto once the first method is proven
7. **Mobile app** — only if it's actually on the near-term roadmap
