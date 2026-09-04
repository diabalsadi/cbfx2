---
name: overview
description: "Skill for the Overview area of cbfx2. 20 symbols across 14 files."
---

# Overview

20 symbols | 14 files | Cohesion: 85%

## When to Use

- Working with code in `frontend/`
- Understanding how isAdminRole, AccountPage, CopyTradingPage work
- Modifying overview-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/admin/overview/page.tsx` | OverviewPage, fmt, fmtCurr |
| `frontend/components/UserNav/index.tsx` | LogoIcon, UserNav, isActive |
| `frontend/app/(user)/copy-trading/CopyTradingClient.tsx` | CopyTradingPage, Sparkline |
| `frontend/app/admin/articles/page.tsx` | ArticlesPage, handleDelete |
| `frontend/helpers/roles.ts` | isAdminRole |
| `frontend/app/(user)/account/AccountClient.tsx` | AccountPage |
| `frontend/app/(user)/forum/ForumClient.tsx` | ForumPage |
| `frontend/app/(user)/forum/[id]/ForumThreadClient.tsx` | ThreadPage |
| `frontend/app/admin/account/page.tsx` | AccountAdmin |
| `frontend/app/admin/layout.tsx` | AdminLayoutWrapper |

## Entry Points

Start here when exploring this area:

- **`isAdminRole`** (Function) — `frontend/helpers/roles.ts:5`
- **`AccountPage`** (Function) — `frontend/app/(user)/account/AccountClient.tsx:14`
- **`CopyTradingPage`** (Function) — `frontend/app/(user)/copy-trading/CopyTradingClient.tsx:118`
- **`ForumPage`** (Function) — `frontend/app/(user)/forum/ForumClient.tsx:19`
- **`ThreadPage`** (Function) — `frontend/app/(user)/forum/[id]/ForumThreadClient.tsx:16`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `isAdminRole` | Function | `frontend/helpers/roles.ts` | 5 |
| `AccountPage` | Function | `frontend/app/(user)/account/AccountClient.tsx` | 14 |
| `CopyTradingPage` | Function | `frontend/app/(user)/copy-trading/CopyTradingClient.tsx` | 118 |
| `ForumPage` | Function | `frontend/app/(user)/forum/ForumClient.tsx` | 19 |
| `ThreadPage` | Function | `frontend/app/(user)/forum/[id]/ForumThreadClient.tsx` | 16 |
| `ArticlesPage` | Function | `frontend/app/admin/articles/page.tsx` | 18 |
| `handleDelete` | Function | `frontend/app/admin/articles/page.tsx` | 32 |
| `AdminLayoutWrapper` | Function | `frontend/app/admin/layout.tsx` | 7 |
| `LoginPage` | Function | `frontend/app/admin/login/page.tsx` | 7 |
| `OverviewPage` | Function | `frontend/app/admin/overview/page.tsx` | 26 |
| `fmt` | Function | `frontend/app/admin/overview/page.tsx` | 49 |
| `fmtCurr` | Function | `frontend/app/admin/overview/page.tsx` | 50 |
| `AdminRootPage` | Function | `frontend/app/admin/page.tsx` | 5 |
| `UserNav` | Function | `frontend/components/UserNav/index.tsx` | 39 |
| `isActive` | Function | `frontend/components/UserNav/index.tsx` | 46 |
| `useAuth` | Function | `frontend/contexts/AuthContext.tsx` | 124 |
| `useLoginModal` | Function | `frontend/contexts/LoginModalContext.tsx` | 30 |
| `Sparkline` | Function | `frontend/app/(user)/copy-trading/CopyTradingClient.tsx` | 289 |
| `AccountAdmin` | Function | `frontend/app/admin/account/page.tsx` | 29 |
| `LogoIcon` | Function | `frontend/components/UserNav/index.tsx` | 23 |

## Connected Areas

| Area | Connections |
|------|-------------|
| TradingViewWidgets | 1 calls |

## How to Explore

1. `context({name: "isAdminRole"})` — see callers and callees
2. `query({search_query: "overview"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
