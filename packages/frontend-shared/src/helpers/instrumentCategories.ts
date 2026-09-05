// Shared with backend/app/models/symbol_category.py's category vocabulary and
// backend/app/schemas/broker.py's InstrumentCashback.category — keep in sync.
// Both backend fields are plain unvalidated strings (no DB enum), so this list
// is the single source of truth for which values are offered/understood.
export const INSTRUMENT_CATEGORIES = [
  "forex",
  "spot_metals",
  "spot_energies",
  "spot_indices",
  "crypto_cfds",
  "future_indices",
  "future_energies",
  "future_metals",
  "shares_cfds",
  "other",
] as const;

export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number];
