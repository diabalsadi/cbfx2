---
name: app
description: "Skill for the App area of cbfx2. 14 symbols across 8 files."
---

# App

14 symbols | 8 files | Cohesion: 91%

## When to Use

- Working with code in `frontend/`
- Understanding how slugifySymbol, symbolHref, getSymbols work
- Modifying app-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/HomeClient.tsx` | brokerInitials, timeAgo, HomePage, dismissBanner |
| `frontend/helpers/tradingviewSymbols.ts` | slugifySymbol, symbolHref, getSymbols |
| `frontend/helpers/jsonLd.ts` | organizationJsonLd, websiteJsonLd |
| `frontend/app/(user)/layout.tsx` | UserLayout |
| `frontend/app/(user)/markets/MarketsClient.tsx` | MarketsPage |
| `frontend/components/TradingViewWidgets/index.tsx` | SingleTickerWidget |
| `frontend/contexts/LoginModalContext.tsx` | LoginModalProvider |
| `frontend/app/page.tsx` | Page |

## Entry Points

Start here when exploring this area:

- **`slugifySymbol`** (Function) — `frontend/helpers/tradingviewSymbols.ts:1`
- **`symbolHref`** (Function) — `frontend/helpers/tradingviewSymbols.ts:76`
- **`getSymbols`** (Function) — `frontend/helpers/tradingviewSymbols.ts:81`
- **`UserLayout`** (Function) — `frontend/app/(user)/layout.tsx:5`
- **`MarketsPage`** (Function) — `frontend/app/(user)/markets/MarketsClient.tsx:10`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `slugifySymbol` | Function | `frontend/helpers/tradingviewSymbols.ts` | 1 |
| `symbolHref` | Function | `frontend/helpers/tradingviewSymbols.ts` | 76 |
| `getSymbols` | Function | `frontend/helpers/tradingviewSymbols.ts` | 81 |
| `UserLayout` | Function | `frontend/app/(user)/layout.tsx` | 5 |
| `MarketsPage` | Function | `frontend/app/(user)/markets/MarketsClient.tsx` | 10 |
| `HomePage` | Function | `frontend/app/HomeClient.tsx` | 54 |
| `dismissBanner` | Function | `frontend/app/HomeClient.tsx` | 63 |
| `SingleTickerWidget` | Function | `frontend/components/TradingViewWidgets/index.tsx` | 54 |
| `LoginModalProvider` | Function | `frontend/contexts/LoginModalContext.tsx` | 15 |
| `organizationJsonLd` | Function | `frontend/helpers/jsonLd.ts` | 6 |
| `websiteJsonLd` | Function | `frontend/helpers/jsonLd.ts` | 15 |
| `Page` | Function | `frontend/app/page.tsx` | 11 |
| `brokerInitials` | Function | `frontend/app/HomeClient.tsx` | 30 |
| `timeAgo` | Function | `frontend/app/HomeClient.tsx` | 46 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HomePage → SlugifySymbol` | intra_community | 3 |
| `MarketsPage → SlugifySymbol` | intra_community | 3 |
| `MarketsPage → TradingViewScriptEmbed` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| TradingViewWidgets | 3 calls |

## How to Explore

1. `context({name: "slugifySymbol"})` — see callers and callees
2. `query({search_query: "app"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
