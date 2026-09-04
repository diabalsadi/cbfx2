---
name: seo
description: "Skill for the Seo area of cbfx2. 10 symbols across 1 files."
---

# Seo

10 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `frontend/`
- Understanding how SeoAdminPage work
- Modifying seo-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/admin/seo/page.tsx` | omitMeta, recordKey, RoutesTab, fetchAll, selectRoute (+5) |

## Entry Points

Start here when exploring this area:

- **`SeoAdminPage`** (Function) — `frontend/app/admin/seo/page.tsx:547`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `SeoAdminPage` | Function | `frontend/app/admin/seo/page.tsx` | 547 |
| `omitMeta` | Function | `frontend/app/admin/seo/page.tsx` | 13 |
| `recordKey` | Function | `frontend/app/admin/seo/page.tsx` | 75 |
| `RoutesTab` | Function | `frontend/app/admin/seo/page.tsx` | 79 |
| `fetchAll` | Function | `frontend/app/admin/seo/page.tsx` | 87 |
| `selectRoute` | Function | `frontend/app/admin/seo/page.tsx` | 110 |
| `updateForm` | Function | `frontend/app/admin/seo/page.tsx` | 117 |
| `handleSave` | Function | `frontend/app/admin/seo/page.tsx` | 122 |
| `SettingsTab` | Function | `frontend/app/admin/seo/page.tsx` | 380 |
| `update` | Function | `frontend/app/admin/seo/page.tsx` | 393 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SeoAdminPage → RecordKey` | intra_community | 4 |
| `SeoAdminPage → OmitMeta` | intra_community | 4 |
| `SeoAdminPage → SelectRoute` | intra_community | 3 |
| `SeoAdminPage → UpdateForm` | intra_community | 3 |
| `SeoAdminPage → Update` | intra_community | 3 |

## How to Explore

1. `context({name: "SeoAdminPage"})` — see callers and callees
2. `query({search_query: "seo"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
