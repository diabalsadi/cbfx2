---
name: cluster-42
description: "Skill for the Cluster_42 area of cbfx2. 8 symbols across 1 files."
---

# Cluster_42

8 symbols | 1 files | Cohesion: 78%

## When to Use

- Working with code in `frontend/`
- Understanding how apiFetch, post, put work
- Modifying cluster_42-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/helpers/api.ts` | apiFetch, post, put, patch, updateMe (+3) |

## Entry Points

Start here when exploring this area:

- **`apiFetch`** (Function) — `frontend/helpers/api.ts:5`
- **`post`** (Function) — `frontend/helpers/api.ts:52`
- **`put`** (Function) — `frontend/helpers/api.ts:54`
- **`patch`** (Function) — `frontend/helpers/api.ts:56`
- **`updateMe`** (Function) — `frontend/helpers/api.ts:381`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `apiFetch` | Function | `frontend/helpers/api.ts` | 5 |
| `post` | Function | `frontend/helpers/api.ts` | 52 |
| `put` | Function | `frontend/helpers/api.ts` | 54 |
| `patch` | Function | `frontend/helpers/api.ts` | 56 |
| `updateMe` | Function | `frontend/helpers/api.ts` | 381 |
| `register` | Function | `frontend/helpers/api.ts` | 385 |
| `create` | Function | `frontend/helpers/api.ts` | 390 |
| `setSettings` | Function | `frontend/helpers/api.ts` | 442 |

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

## Connected Areas

| Area | Connections |
|------|-------------|
| Contexts | 1 calls |

## How to Explore

1. `context({name: "apiFetch"})` — see callers and callees
2. `query({search_query: "cluster_42"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
