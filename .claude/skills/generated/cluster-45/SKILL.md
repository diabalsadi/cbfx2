---
name: cluster-45
description: "Skill for the Cluster_45 area of cbfx2. 4 symbols across 1 files."
---

# Cluster_45

4 symbols | 1 files | Cohesion: 86%

## When to Use

- Working with code in `frontend/`
- Understanding how delete, deleteThread, deleteReply work
- Modifying cluster_45-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/helpers/api.ts` | delete, deleteThread, deleteReply, clear |

## Entry Points

Start here when exploring this area:

- **`delete`** (Function) — `frontend/helpers/api.ts:58`
- **`deleteThread`** (Function) — `frontend/helpers/api.ts:366`
- **`deleteReply`** (Function) — `frontend/helpers/api.ts:367`
- **`clear`** (Function) — `frontend/helpers/api.ts:439`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `delete` | Function | `frontend/helpers/api.ts` | 58 |
| `deleteThread` | Function | `frontend/helpers/api.ts` | 366 |
| `deleteReply` | Function | `frontend/helpers/api.ts` | 367 |
| `clear` | Function | `frontend/helpers/api.ts` | 439 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Clear → WithDebugIp` | cross_community | 4 |
| `DeleteThread → WithDebugIp` | cross_community | 4 |
| `DeleteReply → WithDebugIp` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_42 | 1 calls |

## How to Explore

1. `context({name: "delete"})` — see callers and callees
2. `query({search_query: "cluster_45"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
