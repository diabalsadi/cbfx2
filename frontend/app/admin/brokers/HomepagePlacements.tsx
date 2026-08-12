"use client";
import { useState, useEffect, useCallback } from "react";
import {
  brokerPlacementsApi,
  type BrokerSectionKey,
  type BrokerPlacementRegion,
} from "@/helpers/api";
import { REGIONS, REGION_LABELS } from "@/helpers/regions";
import { COUNTRIES, COUNTRY_LABELS, COUNTRY_TO_REGION } from "@/helpers/countries";
import Card from "@/components/Card";
import styles from "./HomepagePlacements.module.scss";

interface SlotRow {
  position: number;
  broker_id: string;
}

const SECTIONS: { key: BrokerSectionKey; label: string }[] = [
  { key: "featured", label: "Featured Brokers" },
  { key: "sponsored", label: "Sponsored Brokers" },
  { key: "partners", label: "Featured Partners" },
  { key: "more_partners", label: "More Partner Brokers" },
];

type ScopeMode = "default" | "region" | "country";

function scopeLabel(scope: BrokerPlacementRegion): string {
  if (scope === "default") return "Default order";
  return REGION_LABELS[scope] || COUNTRY_LABELS[scope] || scope;
}

type SlotsBySection = Record<BrokerSectionKey, Partial<Record<BrokerPlacementRegion, SlotRow[]>>>;

const EMPTY_SLOTS: SlotsBySection = {
  featured: {},
  sponsored: {},
  partners: {},
  more_partners: {},
};

const EMPTY_SCOPE: Record<BrokerSectionKey, BrokerPlacementRegion> = {
  featured: "default",
  sponsored: "default",
  partners: "default",
  more_partners: "default",
};

const EMPTY_MODE: Record<BrokerSectionKey, ScopeMode> = {
  featured: "default",
  sponsored: "default",
  partners: "default",
  more_partners: "default",
};

const EMPTY_COUNTRY_FILTER: Record<BrokerSectionKey, string> = {
  featured: "all",
  sponsored: "all",
  partners: "all",
  more_partners: "all",
};

const EMPTY_SEARCH: Record<BrokerSectionKey, string> = {
  featured: "",
  sponsored: "",
  partners: "",
  more_partners: "",
};

export default function HomepagePlacements({
  brokers,
}: {
  brokers: { id: string; name: string }[];
}) {
  const [slots, setSlots] = useState<SlotsBySection>(EMPTY_SLOTS);
  const [scope, setScope] = useState<Record<BrokerSectionKey, BrokerPlacementRegion>>(EMPTY_SCOPE);
  const [mode, setMode] = useState<Record<BrokerSectionKey, ScopeMode>>(EMPTY_MODE);
  const [countryRegionFilter, setCountryRegionFilter] =
    useState<Record<BrokerSectionKey, string>>(EMPTY_COUNTRY_FILTER);
  const [countrySearch, setCountrySearch] = useState<Record<BrokerSectionKey, string>>(EMPTY_SEARCH);
  const [error, setError] = useState("");

  const fetchAll = useCallback(() => {
    brokerPlacementsApi
      .list()
      .then((placements) => {
        const grouped: SlotsBySection = {
          featured: {},
          sponsored: {},
          partners: {},
          more_partners: {},
        };
        for (const p of placements) {
          const bySection = grouped[p.section];
          if (!bySection) continue;
          (bySection[p.region] ??= []).push({
            position: p.position,
            broker_id: p.broker_id,
          });
        }
        (Object.keys(grouped) as BrokerSectionKey[]).forEach((key) => {
          Object.values(grouped[key]).forEach((rows) =>
            rows?.sort((a, b) => a.position - b.position),
          );
        });
        setSlots(grouped);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getRows = (section: BrokerSectionKey, scopeValue: BrokerPlacementRegion) =>
    slots[section][scopeValue] ?? [];

  const setRows = (
    section: BrokerSectionKey,
    scopeValue: BrokerPlacementRegion,
    updater: (rows: SlotRow[]) => SlotRow[],
  ) => {
    setSlots((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [scopeValue]: updater(prev[section][scopeValue] ?? []),
      },
    }));
  };

  const handleSelect = async (
    section: BrokerSectionKey,
    scopeValue: BrokerPlacementRegion,
    position: number,
    brokerId: string,
  ) => {
    if (!brokerId) return;
    try {
      await brokerPlacementsApi.set(section, scopeValue, position, brokerId);
      setRows(section, scopeValue, (rows) =>
        rows.map((row) => (row.position === position ? { ...row, broker_id: brokerId } : row)),
      );
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save slot");
    }
  };

  const handleRemove = async (
    section: BrokerSectionKey,
    scopeValue: BrokerPlacementRegion,
    position: number,
  ) => {
    try {
      await brokerPlacementsApi.clear(section, scopeValue, position);
      setRows(section, scopeValue, (rows) => rows.filter((row) => row.position !== position));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to remove slot");
    }
  };

  const handleAddSlot = (section: BrokerSectionKey, scopeValue: BrokerPlacementRegion) => {
    setRows(section, scopeValue, (rows) => {
      const nextPosition = rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 1;
      return [...rows, { position: nextPosition, broker_id: "" }];
    });
  };

  const selectMode = (section: BrokerSectionKey, next: ScopeMode) => {
    setMode((prev) => ({ ...prev, [section]: next }));
    if (next === "default") {
      setScope((prev) => ({ ...prev, [section]: "default" }));
    }
  };

  return (
    <Card className={styles.container}>
      <div>
        <h3 className={styles.title}>Homepage Placement</h3>
        <p className={styles.subtitle}>
          Choose which broker fills each slot in every homepage section. Optionally
          set a different order per coverage region or country — visitors detected
          there see it instead of the default order (a country override wins over
          a region override, which wins over the default).
        </p>
      </div>

      {error && <p>{error}</p>}

      <div className={styles.grid}>
        {SECTIONS.map(({ key: section, label }) => {
          const activeScope = scope[section];
          const activeMode = mode[section];
          const rows = getRows(section, activeScope);
          const regionFilter = countryRegionFilter[section];
          const search = countrySearch[section];
          const filteredCountries = COUNTRIES.filter((c) => {
            if (regionFilter !== "all" && COUNTRY_TO_REGION[c.value] !== regionFilter) return false;
            if (search && !c.label.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
          });

          return (
            <div key={section} className={styles.sectionCard}>
              <div className={styles.sectionTitle}>{label}</div>

              <div className={styles.scopeModeToggle}>
                <button
                  type="button"
                  className={`${styles.scopeModeBtn} ${activeMode === "default" ? styles.scopeModeBtnActive : ""}`}
                  onClick={() => selectMode(section, "default")}
                >
                  Default
                </button>
                <button
                  type="button"
                  className={`${styles.scopeModeBtn} ${activeMode === "region" ? styles.scopeModeBtnActive : ""}`}
                  onClick={() => selectMode(section, "region")}
                >
                  By Region
                </button>
                <button
                  type="button"
                  className={`${styles.scopeModeBtn} ${activeMode === "country" ? styles.scopeModeBtnActive : ""}`}
                  onClick={() => selectMode(section, "country")}
                >
                  By Country
                </button>
              </div>

              {activeMode === "region" && (
                <div className={styles.regionChips}>
                  {REGIONS.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      className={`${styles.regionChip} ${
                        activeScope === r.value ? styles.regionChipActive : ""
                      }`}
                      onClick={() => setScope((prev) => ({ ...prev, [section]: r.value }))}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}

              {activeMode === "country" && (
                <div className={styles.countryPicker}>
                  <div className={styles.countryFilterRow}>
                    <select
                      className={styles.countryRegionFilter}
                      value={regionFilter}
                      onChange={(e) =>
                        setCountryRegionFilter((prev) => ({ ...prev, [section]: e.target.value }))
                      }
                      aria-label={`Filter countries by region for ${label}`}
                    >
                      <option value="all">All regions</option>
                      {REGIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className={styles.countrySearchInput}
                      placeholder="Search countries…"
                      value={search}
                      onChange={(e) =>
                        setCountrySearch((prev) => ({ ...prev, [section]: e.target.value }))
                      }
                    />
                  </div>
                  <div className={styles.countryDropdownList}>
                    {filteredCountries.length === 0 ? (
                      <div className={styles.countryDropdownEmpty}>No matches</div>
                    ) : (
                      filteredCountries.map((c) => (
                        <label key={c.value} className={styles.countryOption}>
                          <input
                            type="radio"
                            name={`${section}-country-scope`}
                            checked={activeScope === c.value}
                            onChange={() => setScope((prev) => ({ ...prev, [section]: c.value }))}
                          />
                          {c.label}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className={styles.scopeActiveLabel}>
                Editing order for: <strong>{scopeLabel(activeScope)}</strong>
              </div>

              <div className={styles.slotList}>
                {rows.length === 0 && (
                  <div className={styles.empty}>No slots configured.</div>
                )}
                {rows.map((row) => (
                  <div key={row.position} className={styles.slotRow}>
                    <span className={styles.slotPosition}>{row.position}</span>
                    <select
                      className={styles.slotSelect}
                      value={row.broker_id}
                      onChange={(e) =>
                        handleSelect(section, activeScope, row.position, e.target.value)
                      }
                    >
                      <option value="">Select broker…</option>
                      {brokers.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.slotRemove}
                      onClick={() => handleRemove(section, activeScope, row.position)}
                      aria-label="Remove slot"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={styles.addSlotBtn}
                onClick={() => handleAddSlot(section, activeScope)}
              >
                + Add Slot
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
