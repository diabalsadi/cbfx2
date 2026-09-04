---
name: schemas
description: "Skill for the Schemas area of cbfx2. 42 symbols across 12 files."
---

# Schemas

42 symbols | 12 files | Cohesion: 100%

## When to Use

- Working with code in `backend/`
- Understanding how ForumThreadBase, ForumThreadCreate, ForumThread work
- Modifying schemas-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `backend/app/schemas/forum.py` | ForumThreadBase, ForumThreadCreate, ForumThread, ForumThreadDetail, ForumReplyBase (+2) |
| `backend/app/schemas/broker.py` | _validate_coverage, _check_geo_coverage, _check_geo_coverage, BrokerBase, BrokerCreate (+1) |
| `backend/app/schemas/seo_meta.py` | SeoMetaUpsert, SeoMeta, SeoSettingsUpsert, SeoSettings |
| `backend/app/schemas/analysis.py` | AnalysisBase, AnalysisCreate, Analysis |
| `backend/app/schemas/article.py` | ArticleBase, ArticleCreate, Article |
| `backend/app/schemas/campaign.py` | CampaignBase, CampaignCreate, Campaign |
| `backend/app/schemas/client.py` | ClientBase, ClientCreate, Client |
| `backend/app/schemas/copy_trader.py` | CopyTraderBase, CopyTraderCreate, CopyTrader |
| `backend/app/schemas/market_price.py` | MarketPriceBase, MarketPriceCreate, MarketPrice |
| `backend/app/schemas/play.py` | PlayBase, PlayCreate, Play |

## Entry Points

Start here when exploring this area:

- **`ForumThreadBase`** (Class) — `backend/app/schemas/forum.py:7`
- **`ForumThreadCreate`** (Class) — `backend/app/schemas/forum.py:13`
- **`ForumThread`** (Class) — `backend/app/schemas/forum.py:24`
- **`ForumThreadDetail`** (Class) — `backend/app/schemas/forum.py:60`
- **`AnalysisBase`** (Class) — `backend/app/schemas/analysis.py:5`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `ForumThreadBase` | Class | `backend/app/schemas/forum.py` | 7 |
| `ForumThreadCreate` | Class | `backend/app/schemas/forum.py` | 13 |
| `ForumThread` | Class | `backend/app/schemas/forum.py` | 24 |
| `ForumThreadDetail` | Class | `backend/app/schemas/forum.py` | 60 |
| `AnalysisBase` | Class | `backend/app/schemas/analysis.py` | 5 |
| `AnalysisCreate` | Class | `backend/app/schemas/analysis.py` | 12 |
| `Analysis` | Class | `backend/app/schemas/analysis.py` | 23 |
| `ArticleBase` | Class | `backend/app/schemas/article.py` | 5 |
| `ArticleCreate` | Class | `backend/app/schemas/article.py` | 22 |
| `Article` | Class | `backend/app/schemas/article.py` | 41 |
| `BrokerBase` | Class | `backend/app/schemas/broker.py` | 30 |
| `BrokerCreate` | Class | `backend/app/schemas/broker.py` | 45 |
| `Broker` | Class | `backend/app/schemas/broker.py` | 70 |
| `CampaignBase` | Class | `backend/app/schemas/campaign.py` | 5 |
| `CampaignCreate` | Class | `backend/app/schemas/campaign.py` | 18 |
| `Campaign` | Class | `backend/app/schemas/campaign.py` | 35 |
| `ClientBase` | Class | `backend/app/schemas/client.py` | 5 |
| `ClientCreate` | Class | `backend/app/schemas/client.py` | 14 |
| `Client` | Class | `backend/app/schemas/client.py` | 27 |
| `CopyTraderBase` | Class | `backend/app/schemas/copy_trader.py` | 5 |

## How to Explore

1. `context({name: "ForumThreadBase"})` — see callers and callees
2. `query({search_query: "schemas"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
