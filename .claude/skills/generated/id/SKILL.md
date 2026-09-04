---
name: id
description: "Skill for the [id] area of cbfx2. 34 symbols across 21 files."
---

# [id]

34 symbols | 21 files | Cohesion: 85%

## When to Use

- Working with code in `frontend/`
- Understanding how discussionForumPostingJsonLd, getSeoMeta, getSeoSettings work
- Modifying [id]-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/helpers/seo.ts` | fillTokens, apply, getSeoMeta, getSeoSettings, buildMetadata |
| `frontend/app/(user)/analysis/[id]/page.tsx` | generateMetadata, fetchArticle, Page |
| `frontend/app/(user)/forum/[id]/page.tsx` | fetchThread, generateMetadata, Page |
| `frontend/app/(user)/news/[id]/page.tsx` | generateMetadata, fetchArticle, Page |
| `frontend/app/admin/articles/[id]/page.tsx` | RichEditor, EditArticlePage, handleSave |
| `frontend/helpers/jsonLd.ts` | discussionForumPostingJsonLd, articleJsonLd |
| `frontend/app/(auth)/login/page.tsx` | generateMetadata |
| `frontend/app/(auth)/register/page.tsx` | generateMetadata |
| `frontend/app/(user)/account/page.tsx` | generateMetadata |
| `frontend/app/(user)/analysis/page.tsx` | generateMetadata |

## Entry Points

Start here when exploring this area:

- **`discussionForumPostingJsonLd`** (Function) — `frontend/helpers/jsonLd.ts:89`
- **`getSeoMeta`** (Function) — `frontend/helpers/seo.ts:100`
- **`getSeoSettings`** (Function) — `frontend/helpers/seo.ts:122`
- **`buildMetadata`** (Function) — `frontend/helpers/seo.ts:141`
- **`generateMetadata`** (Function) — `frontend/app/(auth)/login/page.tsx:6`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `discussionForumPostingJsonLd` | Function | `frontend/helpers/jsonLd.ts` | 89 |
| `getSeoMeta` | Function | `frontend/helpers/seo.ts` | 100 |
| `getSeoSettings` | Function | `frontend/helpers/seo.ts` | 122 |
| `buildMetadata` | Function | `frontend/helpers/seo.ts` | 141 |
| `generateMetadata` | Function | `frontend/app/(auth)/login/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(auth)/register/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(user)/account/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(user)/analysis/[id]/page.tsx` | 29 |
| `generateMetadata` | Function | `frontend/app/(user)/analysis/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(user)/brokers/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(user)/calendar/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(user)/cashback/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(user)/copy-trading/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(user)/forum/[id]/page.tsx` | 25 |
| `Page` | Function | `frontend/app/(user)/forum/[id]/page.tsx` | 36 |
| `generateMetadata` | Function | `frontend/app/(user)/forum/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(user)/markets/[symbol]/page.tsx` | 7 |
| `generateMetadata` | Function | `frontend/app/(user)/markets/page.tsx` | 6 |
| `generateMetadata` | Function | `frontend/app/(user)/news/[id]/page.tsx` | 29 |
| `generateMetadata` | Function | `frontend/app/(user)/news/page.tsx` | 6 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GenerateMetadata → Apply` | intra_community | 4 |
| `GenerateMetadata → Apply` | intra_community | 4 |
| `GenerateMetadata → Apply` | intra_community | 4 |
| `GenerateMetadata → Apply` | intra_community | 4 |
| `GenerateMetadata → Apply` | intra_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `GenerateMetadata → Apply` | intra_community | 4 |
| `Page → Apply` | cross_community | 4 |
| `GenerateMetadata → Apply` | intra_community | 4 |
| `Page → Apply` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| TradingViewWidgets | 1 calls |

## How to Explore

1. `context({name: "discussionForumPostingJsonLd"})` — see callers and callees
2. `query({search_query: "[id]"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
