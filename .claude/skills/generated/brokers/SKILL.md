---
name: brokers
description: "Skill for the Brokers area of cbfx2. 13 symbols across 1 files."
---

# Brokers

13 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `frontend/`
- Understanding how BrokersAdminPage, fetchBrokers, openCreateForm work
- Modifying brokers-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/admin/brokers/page.tsx` | coverageLabel, getInitials, BrokersAdminPage, fetchBrokers, openCreateForm (+8) |

## Entry Points

Start here when exploring this area:

- **`BrokersAdminPage`** (Function) — `frontend/app/admin/brokers/page.tsx:47`
- **`fetchBrokers`** (Function) — `frontend/app/admin/brokers/page.tsx:74`
- **`openCreateForm`** (Function) — `frontend/app/admin/brokers/page.tsx:87`
- **`openEditForm`** (Function) — `frontend/app/admin/brokers/page.tsx:94`
- **`closeForm`** (Function) — `frontend/app/admin/brokers/page.tsx:109`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `BrokersAdminPage` | Function | `frontend/app/admin/brokers/page.tsx` | 47 |
| `fetchBrokers` | Function | `frontend/app/admin/brokers/page.tsx` | 74 |
| `openCreateForm` | Function | `frontend/app/admin/brokers/page.tsx` | 87 |
| `openEditForm` | Function | `frontend/app/admin/brokers/page.tsx` | 94 |
| `closeForm` | Function | `frontend/app/admin/brokers/page.tsx` | 109 |
| `setCoverageType` | Function | `frontend/app/admin/brokers/page.tsx` | 118 |
| `toggleRegion` | Function | `frontend/app/admin/brokers/page.tsx` | 124 |
| `toggleCountry` | Function | `frontend/app/admin/brokers/page.tsx` | 133 |
| `handleSubmit` | Function | `frontend/app/admin/brokers/page.tsx` | 146 |
| `handleDelete` | Function | `frontend/app/admin/brokers/page.tsx` | 190 |
| `statusBadge` | Function | `frontend/app/admin/brokers/page.tsx` | 200 |
| `coverageLabel` | Function | `frontend/app/admin/brokers/page.tsx` | 32 |
| `getInitials` | Function | `frontend/app/admin/brokers/page.tsx` | 38 |

## How to Explore

1. `context({name: "BrokersAdminPage"})` — see callers and callees
2. `query({search_query: "brokers"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
