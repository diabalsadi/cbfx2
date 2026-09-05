---
name: cashback
description: "Skill for the Cashback area of cbfx2. 5 symbols across 1 files."
---

# Cashback

5 symbols | 1 files | Cohesion: 80%

## When to Use

- Working with code in `frontend/`
- Understanding how CashbackPage, fetchData work
- Modifying cashback-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/(user)/cashback/CashbackClient.tsx` | initials, formatDate, AddAccountModal, CashbackPage, fetchData |

## Entry Points

Start here when exploring this area:

- **`CashbackPage`** (Function) — `frontend/app/(user)/cashback/CashbackClient.tsx:153`
- **`fetchData`** (Function) — `frontend/app/(user)/cashback/CashbackClient.tsx:164`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `CashbackPage` | Function | `frontend/app/(user)/cashback/CashbackClient.tsx` | 153 |
| `fetchData` | Function | `frontend/app/(user)/cashback/CashbackClient.tsx` | 164 |
| `initials` | Function | `frontend/app/(user)/cashback/CashbackClient.tsx` | 13 |
| `formatDate` | Function | `frontend/app/(user)/cashback/CashbackClient.tsx` | 22 |
| `AddAccountModal` | Function | `frontend/app/(user)/cashback/CashbackClient.tsx` | 56 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Overview | 2 calls |

## How to Explore

1. `context({name: "CashbackPage"})` — see callers and callees
2. `query({search_query: "cashback"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
