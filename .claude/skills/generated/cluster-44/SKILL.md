---
name: cluster-44
description: "Skill for the Cluster_44 area of cbfx2. 16 symbols across 1 files."
---

# Cluster_44

16 symbols | 1 files | Cohesion: 94%

## When to Use

- Working with code in `frontend/`
- Understanding how get, list, listOpen work
- Modifying cluster_44-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/helpers/api.ts` | get, list, listOpen, listAnalysis, getAnalysis (+11) |

## Entry Points

Start here when exploring this area:

- **`get`** (Function) — `frontend/helpers/api.ts:51`
- **`list`** (Function) — `frontend/helpers/api.ts:318`
- **`listOpen`** (Function) — `frontend/helpers/api.ts:334`
- **`listAnalysis`** (Function) — `frontend/helpers/api.ts:350`
- **`getAnalysis`** (Function) — `frontend/helpers/api.ts:351`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `get` | Function | `frontend/helpers/api.ts` | 51 |
| `list` | Function | `frontend/helpers/api.ts` | 318 |
| `listOpen` | Function | `frontend/helpers/api.ts` | 334 |
| `listAnalysis` | Function | `frontend/helpers/api.ts` | 350 |
| `getAnalysis` | Function | `frontend/helpers/api.ts` | 351 |
| `listThreads` | Function | `frontend/helpers/api.ts` | 355 |
| `getThread` | Function | `frontend/helpers/api.ts` | 363 |
| `homepage` | Function | `frontend/helpers/api.ts` | 371 |
| `adBanners` | Function | `frontend/helpers/api.ts` | 372 |
| `brokers` | Function | `frontend/helpers/api.ts` | 376 |
| `me` | Function | `frontend/helpers/api.ts` | 380 |
| `listMine` | Function | `frontend/helpers/api.ts` | 389 |
| `listTransactions` | Function | `frontend/helpers/api.ts` | 392 |
| `listRoutes` | Function | `frontend/helpers/api.ts` | 436 |
| `set` | Function | `frontend/helpers/api.ts` | 437 |
| `getSettings` | Function | `frontend/helpers/api.ts` | 441 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `List → WithDebugIp` | cross_community | 5 |
| `ListThreads → WithDebugIp` | cross_community | 5 |
| `ListOpen → WithDebugIp` | cross_community | 4 |
| `ListAnalysis → WithDebugIp` | cross_community | 4 |
| `Homepage → WithDebugIp` | cross_community | 4 |
| `AdBanners → WithDebugIp` | cross_community | 4 |
| `Brokers → WithDebugIp` | cross_community | 4 |
| `Me → WithDebugIp` | cross_community | 4 |
| `ListMine → WithDebugIp` | cross_community | 4 |
| `ListTransactions → WithDebugIp` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_42 | 4 calls |

## How to Explore

1. `context({name: "get"})` — see callers and callees
2. `query({search_query: "cluster_44"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
