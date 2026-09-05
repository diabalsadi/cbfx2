---
name: ads-placements
description: "Skill for the Ads-placements area of cbfx2. 23 symbols across 2 files."
---

# Ads-placements

23 symbols | 2 files | Cohesion: 88%

## When to Use

- Working with code in `frontend/`
- Understanding how AdBanners, fetchAll, activeScope work
- Modifying ads-placements-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/admin/ads-placements/AdBanners.tsx` | toForm, scopeLabel, formKey, AdBanners, fetchAll (+9) |
| `frontend/app/admin/ads-placements/BrokerSectionPlacements.tsx` | scopeLabel, BrokerSectionPlacements, fetchAll, getRows, selectMode (+4) |

## Entry Points

Start here when exploring this area:

- **`AdBanners`** (Function) — `frontend/app/admin/ads-placements/AdBanners.tsx:63`
- **`fetchAll`** (Function) — `frontend/app/admin/ads-placements/AdBanners.tsx:75`
- **`activeScope`** (Function) — `frontend/app/admin/ads-placements/AdBanners.tsx:111`
- **`activeMode`** (Function) — `frontend/app/admin/ads-placements/AdBanners.tsx:112`
- **`getForm`** (Function) — `frontend/app/admin/ads-placements/AdBanners.tsx:114`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `AdBanners` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 63 |
| `fetchAll` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 75 |
| `activeScope` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 111 |
| `activeMode` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 112 |
| `getForm` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 114 |
| `ensureForm` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 121 |
| `selectMode` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 130 |
| `selectScope` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 138 |
| `updateForm` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 143 |
| `handleSave` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 148 |
| `handleClear` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 173 |
| `BrokerSectionPlacements` | Function | `frontend/app/admin/ads-placements/BrokerSectionPlacements.tsx` | 68 |
| `fetchAll` | Function | `frontend/app/admin/ads-placements/BrokerSectionPlacements.tsx` | 81 |
| `getRows` | Function | `frontend/app/admin/ads-placements/BrokerSectionPlacements.tsx` | 113 |
| `selectMode` | Function | `frontend/app/admin/ads-placements/BrokerSectionPlacements.tsx` | 167 |
| `setRows` | Function | `frontend/app/admin/ads-placements/BrokerSectionPlacements.tsx` | 116 |
| `handleSelect` | Function | `frontend/app/admin/ads-placements/BrokerSectionPlacements.tsx` | 130 |
| `handleRemove` | Function | `frontend/app/admin/ads-placements/BrokerSectionPlacements.tsx` | 147 |
| `handleAddSlot` | Function | `frontend/app/admin/ads-placements/BrokerSectionPlacements.tsx` | 160 |
| `toForm` | Function | `frontend/app/admin/ads-placements/AdBanners.tsx` | 37 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `AdBanners → FormKey` | intra_community | 3 |
| `AdBanners → ToForm` | intra_community | 3 |
| `HandleSave → FormKey` | intra_community | 3 |
| `HandleSave → ToForm` | intra_community | 3 |
| `UpdateForm → FormKey` | intra_community | 3 |
| `UpdateForm → ToForm` | intra_community | 3 |
| `SelectMode → FormKey` | intra_community | 3 |
| `SelectMode → ToForm` | intra_community | 3 |
| `SelectScope → FormKey` | intra_community | 3 |
| `SelectScope → ToForm` | intra_community | 3 |

## How to Explore

1. `context({name: "AdBanners"})` — see callers and callees
2. `query({search_query: "ads-placements"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
