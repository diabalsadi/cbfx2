// Shared with backend/app/models/symbol_category.py's category vocabulary and
// backend/app/schemas/broker.py's InstrumentCashback.category — keep in sync.
export const INSTRUMENT_CATEGORIES = [
  "forex",
  "metals",
  "commodities",
  "crypto",
  "indices",
  "stocks",
  "other",
] as const;

export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number];
