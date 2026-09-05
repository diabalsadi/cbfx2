---
name: contexts
description: "Skill for the Contexts area of cbfx2. 9 symbols across 5 files."
---

# Contexts

9 symbols | 5 files | Cohesion: 94%

## When to Use

- Working with code in `frontend/`
- Understanding how withDebugIp, BrokersPage, RootLayout work
- Modifying contexts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/contexts/AuthContext.tsx` | AuthProvider, fetchMe, login, refreshUser |
| `frontend/app/(user)/brokers/BrokersClient.tsx` | getInitials, BrokersPage |
| `frontend/helpers/debugIp.ts` | withDebugIp |
| `frontend/app/layout.tsx` | RootLayout |
| `frontend/contexts/ThemeContext.tsx` | ThemeProvider |

## Entry Points

Start here when exploring this area:

- **`withDebugIp`** (Function) — `frontend/helpers/debugIp.ts:6`
- **`BrokersPage`** (Function) — `frontend/app/(user)/brokers/BrokersClient.tsx:46`
- **`RootLayout`** (Function) — `frontend/app/layout.tsx:39`
- **`AuthProvider`** (Function) — `frontend/contexts/AuthContext.tsx:36`
- **`fetchMe`** (Function) — `frontend/contexts/AuthContext.tsx:41`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `withDebugIp` | Function | `frontend/helpers/debugIp.ts` | 6 |
| `BrokersPage` | Function | `frontend/app/(user)/brokers/BrokersClient.tsx` | 46 |
| `RootLayout` | Function | `frontend/app/layout.tsx` | 39 |
| `AuthProvider` | Function | `frontend/contexts/AuthContext.tsx` | 36 |
| `fetchMe` | Function | `frontend/contexts/AuthContext.tsx` | 41 |
| `login` | Function | `frontend/contexts/AuthContext.tsx` | 89 |
| `refreshUser` | Function | `frontend/contexts/AuthContext.tsx` | 112 |
| `ThemeProvider` | Function | `frontend/contexts/ThemeContext.tsx` | 18 |
| `getInitials` | Function | `frontend/app/(user)/brokers/BrokersClient.tsx` | 28 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `List → WithDebugIp` | cross_community | 5 |
| `ListThreads → WithDebugIp` | cross_community | 5 |
| `Clear → WithDebugIp` | cross_community | 4 |
| `ListOpen → WithDebugIp` | cross_community | 4 |
| `ListAnalysis → WithDebugIp` | cross_community | 4 |
| `DeleteThread → WithDebugIp` | cross_community | 4 |
| `DeleteReply → WithDebugIp` | cross_community | 4 |
| `Homepage → WithDebugIp` | cross_community | 4 |
| `AdBanners → WithDebugIp` | cross_community | 4 |
| `Brokers → WithDebugIp` | cross_community | 4 |

## How to Explore

1. `context({name: "withDebugIp"})` — see callers and callees
2. `query({search_query: "contexts"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
