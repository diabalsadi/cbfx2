---
name: clients
description: "Skill for the Clients area of cbfx2. 5 symbols across 1 files."
---

# Clients

5 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `frontend/`
- Understanding how ClientsPage, fetchClients, handleCreate work
- Modifying clients-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/admin/clients/page.tsx` | ClientsPage, fetchClients, handleCreate, handleDelete, statusBadge |

## Entry Points

Start here when exploring this area:

- **`ClientsPage`** (Function) — `frontend/app/admin/clients/page.tsx:19`
- **`fetchClients`** (Function) — `frontend/app/admin/clients/page.tsx:35`
- **`handleCreate`** (Function) — `frontend/app/admin/clients/page.tsx:48`
- **`handleDelete`** (Function) — `frontend/app/admin/clients/page.tsx:86`
- **`statusBadge`** (Function) — `frontend/app/admin/clients/page.tsx:96`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ClientsPage` | Function | `frontend/app/admin/clients/page.tsx` | 19 |
| `fetchClients` | Function | `frontend/app/admin/clients/page.tsx` | 35 |
| `handleCreate` | Function | `frontend/app/admin/clients/page.tsx` | 48 |
| `handleDelete` | Function | `frontend/app/admin/clients/page.tsx` | 86 |
| `statusBadge` | Function | `frontend/app/admin/clients/page.tsx` | 96 |

## How to Explore

1. `context({name: "ClientsPage"})` — see callers and callees
2. `query({search_query: "clients"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
