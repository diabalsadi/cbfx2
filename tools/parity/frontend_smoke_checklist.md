# Frontend parity smoke checklist

Manual (or Playwright-scripted) pass over every page, run against the
monolith now as a baseline, then rerun against `apps/crm-frontend` /
`apps/user-frontend` after each later phase. For each page: confirm it
renders without error, and exercise one write action where the page has one.

Not automated here deliberately — several flows (login, MT5 connect, Stripe
checkout, broker report upload) touch real external services or session
state that shouldn't be scripted against a shared dev environment without
your say-so. Fill in pass/fail per run.

## Admin portal (`app/[locale]/admin/`) — 25 pages

- [ ] account
- [ ] ads-campaigns
- [ ] ads-placements
- [ ] articles
- [ ] brokers
- [ ] change-password
- [ ] clients
- [ ] contact-us
- [ ] copy-traders
- [ ] login
- [ ] media
- [ ] mt5-accounts
- [ ] overview
- [ ] rebate-payouts
- [ ] referral-clients
- [ ] referrals
- [ ] reports
- [ ] seo
- [ ] symbol-categories
- [ ] users
- [ ] withdrawal-requests

(22 folders listed in exploration; some folders contain >1 page — recount
against `apps/frontend/app/[locale]/admin/` at run time to confirm the full
25.)

## User portal (`app/[locale]/(user)/`) — 16 pages

- [ ] account
- [ ] analysis
- [ ] brokers
- [ ] calendar
- [ ] cashback
- [ ] copy-trading
- [ ] forum
- [ ] markets
- [ ] news
- [ ] plays
- [ ] referrals

(11 folders — recount sub-pages at run time to confirm the full 16.)

## Auth (`app/[locale]/(auth)/`) — 3 pages

- [ ] login
- [ ] register
- [ ] forgot-password

## Cross-portal case (explicitly flagged in the split plan)

- [ ] Log in as a `role="client"` account via the **admin** portal login — confirm it lands on the referral view as today.
- [ ] Log in as the same `role="client"` account via the **user** portal `(auth)/login` — confirm it also works and lands on `/referrals`.
- [ ] After the Phase 6/7 app split: repeat both, and note explicitly whether either now requires a cross-origin navigation that didn't exist when both portals shared one Next.js app.
