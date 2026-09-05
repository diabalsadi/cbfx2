---
name: ads-campaigns
description: "Skill for the Ads-campaigns area of cbfx2. 6 symbols across 1 files."
---

# Ads-campaigns

6 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `frontend/`
- Understanding how AdsCampaignsPage, fetchCampaigns, handleCreate work
- Modifying ads-campaigns-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/admin/ads-campaigns/page.tsx` | AdsCampaignsPage, fetchCampaigns, handleCreate, handleDelete, handleStatusChange (+1) |

## Entry Points

Start here when exploring this area:

- **`AdsCampaignsPage`** (Function) — `frontend/app/admin/ads-campaigns/page.tsx:26`
- **`fetchCampaigns`** (Function) — `frontend/app/admin/ads-campaigns/page.tsx:39`
- **`handleCreate`** (Function) — `frontend/app/admin/ads-campaigns/page.tsx:52`
- **`handleDelete`** (Function) — `frontend/app/admin/ads-campaigns/page.tsx:76`
- **`handleStatusChange`** (Function) — `frontend/app/admin/ads-campaigns/page.tsx:86`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `AdsCampaignsPage` | Function | `frontend/app/admin/ads-campaigns/page.tsx` | 26 |
| `fetchCampaigns` | Function | `frontend/app/admin/ads-campaigns/page.tsx` | 39 |
| `handleCreate` | Function | `frontend/app/admin/ads-campaigns/page.tsx` | 52 |
| `handleDelete` | Function | `frontend/app/admin/ads-campaigns/page.tsx` | 76 |
| `handleStatusChange` | Function | `frontend/app/admin/ads-campaigns/page.tsx` | 86 |
| `fmt` | Function | `frontend/app/admin/ads-campaigns/page.tsx` | 95 |

## How to Explore

1. `context({name: "AdsCampaignsPage"})` — see callers and callees
2. `query({search_query: "ads-campaigns"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
