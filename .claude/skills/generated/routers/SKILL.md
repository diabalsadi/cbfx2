---
name: routers
description: "Skill for the Routers area of cbfx2. 119 symbols across 22 files."
---

# Routers

119 symbols | 22 files | Cohesion: 64%

## When to Use

- Working with code in `backend/`
- Understanding how checker, create_analysis, update_analysis work
- Modifying routers-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `backend/app/routers/public.py` | list_published_articles, get_published_article, list_published_analysis, get_published_analysis, get_public_seo_settings (+14) |
| `backend/app/routers/forum.py` | _save_uploaded_image, create_thread, update_thread, delete_thread, create_reply (+4) |
| `backend/app/routers/campaigns.py` | checker, require_roles, list_campaigns, campaign_stats, get_campaign (+3) |
| `backend/app/routers/seo_meta.py` | checker, require_roles, list_seo_meta, list_seo_routes, get_seo_settings (+3) |
| `backend/app/routers/articles.py` | checker, require_roles, list_articles, get_article, create_article (+2) |
| `backend/app/routers/brokers.py` | checker, require_roles, list_brokers, get_broker, create_broker (+2) |
| `backend/app/routers/clients.py` | checker, require_roles, list_clients, get_client, create_client (+2) |
| `backend/app/routers/plays.py` | list_all_plays, create_play, update_play, delete_play, list_open_plays (+1) |
| `backend/app/routers/users.py` | get_me, update_me, require_super_admin, list_users, update_user_role (+1) |
| `backend/app/routers/ad_banners.py` | checker, require_roles, list_banners, set_banner, clear_banner |

## Entry Points

Start here when exploring this area:

- **`checker`** (Function) — `backend/app/routers/ad_banners.py:23`
- **`create_analysis`** (Function) — `backend/app/routers/analysis.py:33`
- **`update_analysis`** (Function) — `backend/app/routers/analysis.py:49`
- **`delete_analysis`** (Function) — `backend/app/routers/analysis.py:69`
- **`checker`** (Function) — `backend/app/routers/articles.py:16`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `checker` | Function | `backend/app/routers/ad_banners.py` | 23 |
| `create_analysis` | Function | `backend/app/routers/analysis.py` | 33 |
| `update_analysis` | Function | `backend/app/routers/analysis.py` | 49 |
| `delete_analysis` | Function | `backend/app/routers/analysis.py` | 69 |
| `checker` | Function | `backend/app/routers/articles.py` | 16 |
| `get_me` | Function | `backend/app/routers/auth.py` | 133 |
| `checker` | Function | `backend/app/routers/broker_placements.py` | 22 |
| `checker` | Function | `backend/app/routers/brokers.py` | 16 |
| `checker` | Function | `backend/app/routers/campaigns.py` | 16 |
| `checker` | Function | `backend/app/routers/clients.py` | 16 |
| `create_copy_trader` | Function | `backend/app/routers/copy_traders.py` | 56 |
| `update_copy_trader` | Function | `backend/app/routers/copy_traders.py` | 72 |
| `delete_copy_trader` | Function | `backend/app/routers/copy_traders.py` | 92 |
| `create_thread` | Function | `backend/app/routers/forum.py` | 123 |
| `update_thread` | Function | `backend/app/routers/forum.py` | 147 |
| `delete_thread` | Function | `backend/app/routers/forum.py` | 167 |
| `create_reply` | Function | `backend/app/routers/forum.py` | 191 |
| `delete_reply` | Function | `backend/app/routers/forum.py` | 223 |
| `create_market_price` | Function | `backend/app/routers/market_prices.py` | 20 |
| `update_market_price` | Function | `backend/app/routers/market_prices.py` | 39 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Delete_user → Get_db` | cross_community | 4 |
| `List_users → Get_db` | cross_community | 4 |
| `Update_user_role → Get_db` | cross_community | 4 |
| `Homepage_aggregate → _is_locatable` | cross_community | 3 |
| `Homepage_aggregate → _covers_visitor` | cross_community | 3 |
| `Get_ad_banners → _is_locatable` | cross_community | 3 |
| `Get_ad_banners → _banner_content` | intra_community | 3 |
| `Register → _is_locatable` | cross_community | 3 |
| `Detect_visitor_region → Get_db` | intra_community | 3 |
| `Detect_visitor_region → _is_locatable` | cross_community | 3 |

## How to Explore

1. `context({name: "checker"})` — see callers and callees
2. `query({search_query: "routers"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
