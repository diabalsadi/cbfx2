---
name: users
description: "Skill for the Users area of cbfx2. 5 symbols across 1 files."
---

# Users

5 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `frontend/`
- Understanding how UsersPage, fetchUsers, handleRoleChange work
- Modifying users-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/app/admin/users/page.tsx` | UsersPage, fetchUsers, handleRoleChange, handleDelete, handleCreate |

## Entry Points

Start here when exploring this area:

- **`UsersPage`** (Function) — `frontend/app/admin/users/page.tsx:22`
- **`fetchUsers`** (Function) — `frontend/app/admin/users/page.tsx:37`
- **`handleRoleChange`** (Function) — `frontend/app/admin/users/page.tsx:50`
- **`handleDelete`** (Function) — `frontend/app/admin/users/page.tsx:65`
- **`handleCreate`** (Function) — `frontend/app/admin/users/page.tsx:75`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `UsersPage` | Function | `frontend/app/admin/users/page.tsx` | 22 |
| `fetchUsers` | Function | `frontend/app/admin/users/page.tsx` | 37 |
| `handleRoleChange` | Function | `frontend/app/admin/users/page.tsx` | 50 |
| `handleDelete` | Function | `frontend/app/admin/users/page.tsx` | 65 |
| `handleCreate` | Function | `frontend/app/admin/users/page.tsx` | 75 |

## How to Explore

1. `context({name: "UsersPage"})` — see callers and callees
2. `query({search_query: "users"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
