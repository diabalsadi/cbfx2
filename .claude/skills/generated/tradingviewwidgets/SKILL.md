---
name: tradingviewwidgets
description: "Skill for the TradingViewWidgets area of cbfx2. 13 symbols across 7 files."
---

# TradingViewWidgets

13 symbols | 7 files | Cohesion: 82%

## When to Use

- Working with code in `frontend/`
- Understanding how getTradingViewSymbol, CalendarPage, SymbolPage work
- Modifying tradingviewwidgets-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `frontend/components/TradingViewWidgets/index.tsx` | TradingViewScriptEmbed, AdvancedChartWidget, TechnicalAnalysisWidget, TopStoriesWidget, EconomicCalendarWidget (+1) |
| `frontend/components/Layout/index.tsx` | Layout, getTitle |
| `frontend/helpers/tradingviewSymbols.ts` | getTradingViewSymbol |
| `frontend/app/(user)/calendar/CalendarClient.tsx` | CalendarPage |
| `frontend/app/(user)/markets/[symbol]/MarketSymbolClient.tsx` | SymbolPage |
| `frontend/app/(user)/markets/[symbol]/page.tsx` | Page |
| `frontend/contexts/ThemeContext.tsx` | useTheme |

## Entry Points

Start here when exploring this area:

- **`getTradingViewSymbol`** (Function) — `frontend/helpers/tradingviewSymbols.ts:70`
- **`CalendarPage`** (Function) — `frontend/app/(user)/calendar/CalendarClient.tsx:5`
- **`SymbolPage`** (Function) — `frontend/app/(user)/markets/[symbol]/MarketSymbolClient.tsx:14`
- **`Page`** (Function) — `frontend/app/(user)/markets/[symbol]/page.tsx:18`
- **`AdvancedChartWidget`** (Function) — `frontend/components/TradingViewWidgets/index.tsx:69`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getTradingViewSymbol` | Function | `frontend/helpers/tradingviewSymbols.ts` | 70 |
| `CalendarPage` | Function | `frontend/app/(user)/calendar/CalendarClient.tsx` | 5 |
| `SymbolPage` | Function | `frontend/app/(user)/markets/[symbol]/MarketSymbolClient.tsx` | 14 |
| `Page` | Function | `frontend/app/(user)/markets/[symbol]/page.tsx` | 18 |
| `AdvancedChartWidget` | Function | `frontend/components/TradingViewWidgets/index.tsx` | 69 |
| `TechnicalAnalysisWidget` | Function | `frontend/components/TradingViewWidgets/index.tsx` | 90 |
| `TopStoriesWidget` | Function | `frontend/components/TradingViewWidgets/index.tsx` | 108 |
| `EconomicCalendarWidget` | Function | `frontend/components/TradingViewWidgets/index.tsx` | 127 |
| `SymbolOverviewWidget` | Function | `frontend/components/TradingViewWidgets/index.tsx` | 143 |
| `useTheme` | Function | `frontend/contexts/ThemeContext.tsx` | 44 |
| `Layout` | Function | `frontend/components/Layout/index.tsx` | 78 |
| `getTitle` | Function | `frontend/components/Layout/index.tsx` | 92 |
| `TradingViewScriptEmbed` | Function | `frontend/components/TradingViewWidgets/index.tsx` | 15 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SymbolPage → TradingViewScriptEmbed` | intra_community | 3 |
| `MarketsPage → TradingViewScriptEmbed` | cross_community | 3 |
| `CalendarPage → TradingViewScriptEmbed` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Overview | 1 calls |
| Login | 1 calls |

## How to Explore

1. `context({name: "getTradingViewSymbol"})` — see callers and callees
2. `query({search_query: "tradingviewwidgets"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
