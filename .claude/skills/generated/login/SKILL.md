---
name: login
description: "Skill for the Login area of cbfx2. 13 symbols across 13 files."
---

# Login

13 symbols | 13 files | Cohesion: 65%

## When to Use

- Working with code in `frontend/`
- Understanding how webPageJsonLd, Page, Page work
- Modifying login-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/helpers/jsonLd.ts` | webPageJsonLd |
| `frontend/app/(auth)/login/page.tsx` | Page |
| `frontend/app/(auth)/register/page.tsx` | Page |
| `frontend/app/(user)/account/page.tsx` | Page |
| `frontend/app/(user)/analysis/page.tsx` | Page |
| `frontend/app/(user)/brokers/page.tsx` | Page |
| `frontend/app/(user)/calendar/page.tsx` | Page |
| `frontend/app/(user)/cashback/page.tsx` | Page |
| `frontend/app/(user)/copy-trading/page.tsx` | Page |
| `frontend/app/(user)/forum/page.tsx` | Page |

## Entry Points

Start here when exploring this area:

- **`webPageJsonLd`** (Function) — `frontend/helpers/jsonLd.ts:30`
- **`Page`** (Function) — `frontend/app/(auth)/login/page.tsx:11`
- **`Page`** (Function) — `frontend/app/(auth)/register/page.tsx:11`
- **`Page`** (Function) — `frontend/app/(user)/account/page.tsx:11`
- **`Page`** (Function) — `frontend/app/(user)/analysis/page.tsx:11`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `webPageJsonLd` | Function | `frontend/helpers/jsonLd.ts` | 30 |
| `Page` | Function | `frontend/app/(auth)/login/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(auth)/register/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/account/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/analysis/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/brokers/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/calendar/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/cashback/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/copy-trading/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/forum/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/markets/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/news/page.tsx` | 11 |
| `Page` | Function | `frontend/app/(user)/plays/page.tsx` | 11 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Page → Apply` | cross_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `Page → Apply` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| [id] | 12 calls |

## How to Explore

1. `context({name: "webPageJsonLd"})` — see callers and callees
2. `query({search_query: "login"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
