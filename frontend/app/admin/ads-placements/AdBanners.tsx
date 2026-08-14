"use client";
import { useState, useEffect, useCallback } from "react";
import {
  adBannersApi,
  type AdPlacementPage,
  type AdBanner,
  type AdBannerUpsert,
  type BrokerPlacementRegion,
} from "@/helpers/api";
import { REGIONS, REGION_LABELS } from "@/helpers/regions";
import { COUNTRIES, COUNTRY_LABELS, COUNTRY_TO_REGION } from "@/helpers/countries";
import Card from "@/components/Card";
import styles from "./AdBanners.module.scss";

const PAGE_BANNER_SLOTS: Record<AdPlacementPage, { key: string; label: string }[]> = {
  homepage: [
    { key: "demo_banner", label: "Demo Sponsored Banner" },
    { key: "prime_banner", label: "PrimeTrade Sponsored Banner" },
  ],
};

type ScopeMode = "default" | "region" | "country";

const EMPTY_FORM: AdBannerUpsert = {
  sponsor_name: "",
  description: "",
  badge_text: "SPONSORED",
  logo_src: null,
  link_url: null,
  cta_label: null,
  dismissible: false,
  status: "active",
};

function toForm(b: AdBanner): AdBannerUpsert {
  return {
    sponsor_name: b.sponsor_name,
    description: b.description,
    badge_text: b.badge_text,
    logo_src: b.logo_src,
    link_url: b.link_url,
    cta_label: b.cta_label,
    dismissible: b.dismissible,
    status: b.status,
  };
}

function scopeLabel(scope: BrokerPlacementRegion): string {
  if (scope === "default") return "Default";
  return REGION_LABELS[scope] || COUNTRY_LABELS[scope] || scope;
}

function formKey(slot: string, scope: BrokerPlacementRegion) {
  return `${slot}::${scope}`;
}

type BySlotRegion = Record<string, Partial<Record<BrokerPlacementRegion, AdBanner>>>;

export default function AdBanners({ page }: { page: AdPlacementPage }) {
  const [bySlotRegion, setBySlotRegion] = useState<BySlotRegion>({});
  const [mode, setMode] = useState<Record<string, ScopeMode>>({});
  const [scope, setScope] = useState<Record<string, BrokerPlacementRegion>>({});
  const [forms, setForms] = useState<Record<string, AdBannerUpsert>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [countryRegionFilter, setCountryRegionFilter] = useState<Record<string, string>>({});
  const [countrySearch, setCountrySearch] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const slots = PAGE_BANNER_SLOTS[page] ?? [];

  const fetchAll = useCallback(() => {
    adBannersApi
      .list(page)
      .then((list) => {
        const grouped: BySlotRegion = {};
        list.forEach((b) => {
          (grouped[b.slot] ??= {})[b.region] = b;
        });
        setBySlotRegion(grouped);
        setForms(() => {
          const next: Record<string, AdBannerUpsert> = {};
          slots.forEach(({ key }) => {
            const existing = grouped[key]?.default;
            next[formKey(key, "default")] = existing ? toForm(existing) : { ...EMPTY_FORM };
          });
          return next;
        });
        setMode(() => {
          const next: Record<string, ScopeMode> = {};
          slots.forEach(({ key }) => { next[key] = "default"; });
          return next;
        });
        setScope(() => {
          const next: Record<string, BrokerPlacementRegion> = {};
          slots.forEach(({ key }) => { next[key] = "default"; });
          return next;
        });
      })
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const activeScope = (slot: string) => scope[slot] ?? "default";
  const activeMode = (slot: string) => mode[slot] ?? "default";

  const getForm = (slot: string, scopeValue: BrokerPlacementRegion): AdBannerUpsert => {
    const key = formKey(slot, scopeValue);
    if (forms[key]) return forms[key];
    const existing = bySlotRegion[slot]?.[scopeValue];
    return existing ? toForm(existing) : EMPTY_FORM;
  };

  const ensureForm = (slot: string, scopeValue: BrokerPlacementRegion) => {
    setForms((prev) => {
      const key = formKey(slot, scopeValue);
      if (prev[key]) return prev;
      const existing = bySlotRegion[slot]?.[scopeValue];
      return { ...prev, [key]: existing ? toForm(existing) : { ...EMPTY_FORM } };
    });
  };

  const selectMode = (slot: string, next: ScopeMode) => {
    setMode((prev) => ({ ...prev, [slot]: next }));
    if (next === "default") {
      setScope((prev) => ({ ...prev, [slot]: "default" }));
      ensureForm(slot, "default");
    }
  };

  const selectScope = (slot: string, next: BrokerPlacementRegion) => {
    setScope((prev) => ({ ...prev, [slot]: next }));
    ensureForm(slot, next);
  };

  const updateForm = (slot: string, scopeValue: BrokerPlacementRegion, patch: Partial<AdBannerUpsert>) => {
    const key = formKey(slot, scopeValue);
    setForms((prev) => ({ ...prev, [key]: { ...(prev[key] ?? getForm(slot, scopeValue)), ...patch } }));
  };

  const handleSave = async (slot: string, scopeValue: BrokerPlacementRegion) => {
    const key = formKey(slot, scopeValue);
    const form = forms[key] ?? getForm(slot, scopeValue);
    if (!form.sponsor_name.trim()) {
      alert("Sponsor name is required");
      return;
    }
    setSaving((prev) => ({ ...prev, [key]: true }));
    try {
      const saved = await adBannersApi.set(page, slot, scopeValue, form);
      setBySlotRegion((prev) => ({
        ...prev,
        [slot]: { ...(prev[slot] ?? {}), [scopeValue]: saved },
      }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to save banner");
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleClear = async (slot: string, scopeValue: BrokerPlacementRegion) => {
    if (!confirm(`Remove the ${scopeLabel(scopeValue)} content for this banner?`)) return;
    try {
      await adBannersApi.clear(page, slot, scopeValue);
      setBySlotRegion((prev) => {
        const bySlot = { ...(prev[slot] ?? {}) };
        delete bySlot[scopeValue];
        return { ...prev, [slot]: bySlot };
      });
      setForms((prev) => ({ ...prev, [formKey(slot, scopeValue)]: { ...EMPTY_FORM } }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to remove banner");
    }
  };

  return (
    <Card className={styles.container}>
      <div>
        <h3 className={styles.title}>Banner Ads</h3>
        <p className={styles.subtitle}>
          Standalone sponsored banners on this route — each is its own ad,
          configured separately from the broker section slots above.
          Optionally target different content per coverage region or country;
          visitors detected there see it instead of the default banner (a
          country override wins over a region override, which wins over the
          default).
        </p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        {slots.map(({ key: slot, label }) => {
          const currentScope = activeScope(slot);
          const currentMode = activeMode(slot);
          const form = getForm(slot, currentScope);
          const saveKey = formKey(slot, currentScope);
          const isSaving = !!saving[saveKey];
          const configured = !!bySlotRegion[slot]?.[currentScope];
          const regionFilter = countryRegionFilter[slot] ?? "all";
          const search = countrySearch[slot] ?? "";
          const filteredCountries = COUNTRIES.filter((c) => {
            if (regionFilter !== "all" && COUNTRY_TO_REGION[c.value] !== regionFilter) return false;
            if (search && !c.label.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
          });

          return (
            <div key={slot} className={styles.bannerCard}>
              <div className={styles.bannerCardHeader}>
                <span className={styles.bannerLabel}>{label}</span>
                <span
                  className={`${styles.statusBadge} ${
                    configured ? (form.status === "active" ? styles.active : styles.inactive) : ""
                  }`}
                >
                  {configured
                    ? form.status === "active"
                      ? "Active"
                      : "Inactive"
                    : currentScope === "default"
                      ? "Not configured"
                      : "No override (uses Default)"}
                </span>
              </div>

              <div className={styles.scopeModeToggle}>
                <button
                  type="button"
                  className={`${styles.scopeModeBtn} ${currentMode === "default" ? styles.scopeModeBtnActive : ""}`}
                  onClick={() => selectMode(slot, "default")}
                >
                  Default
                </button>
                <button
                  type="button"
                  className={`${styles.scopeModeBtn} ${currentMode === "region" ? styles.scopeModeBtnActive : ""}`}
                  onClick={() => selectMode(slot, "region")}
                >
                  By Region
                </button>
                <button
                  type="button"
                  className={`${styles.scopeModeBtn} ${currentMode === "country" ? styles.scopeModeBtnActive : ""}`}
                  onClick={() => selectMode(slot, "country")}
                >
                  By Country
                </button>
              </div>

              {currentMode === "region" && (
                <div className={styles.regionChips}>
                  {REGIONS.map((r) => (
                    <button
                      type="button"
                      key={r.value}
                      className={`${styles.regionChip} ${
                        currentScope === r.value ? styles.regionChipActive : ""
                      }`}
                      onClick={() => selectScope(slot, r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}

              {currentMode === "country" && (
                <div className={styles.countryPicker}>
                  <div className={styles.countryFilterRow}>
                    <select
                      className={styles.countryRegionFilter}
                      value={regionFilter}
                      onChange={(e) =>
                        setCountryRegionFilter((prev) => ({ ...prev, [slot]: e.target.value }))
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
                      onChange={(e) => setCountrySearch((prev) => ({ ...prev, [slot]: e.target.value }))}
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
                            name={`${slot}-country-scope`}
                            checked={currentScope === c.value}
                            onChange={() => selectScope(slot, c.value)}
                          />
                          {c.label}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className={styles.scopeActiveLabel}>
                Editing content for: <strong>{scopeLabel(currentScope)}</strong>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Sponsor Name *</label>
                <input
                  className={styles.input}
                  value={form.sponsor_name}
                  onChange={(e) => updateForm(slot, currentScope, { sponsor_name: e.target.value })}
                  placeholder="e.g. Demo FX Broker"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Description</label>
                <input
                  className={styles.input}
                  value={form.description}
                  onChange={(e) => updateForm(slot, currentScope, { description: e.target.value })}
                  placeholder="Trade with confidence. 0 commission on all pairs."
                />
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Badge Text</label>
                  <input
                    className={styles.input}
                    value={form.badge_text}
                    onChange={(e) => updateForm(slot, currentScope, { badge_text: e.target.value })}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>CTA Label</label>
                  <input
                    className={styles.input}
                    value={form.cta_label ?? ""}
                    onChange={(e) => updateForm(slot, currentScope, { cta_label: e.target.value || null })}
                    placeholder="Learn more"
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Link URL</label>
                <input
                  className={styles.input}
                  value={form.link_url ?? ""}
                  onChange={(e) => updateForm(slot, currentScope, { link_url: e.target.value || null })}
                  placeholder="https://example.com"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Logo URL</label>
                <input
                  className={styles.input}
                  value={form.logo_src ?? ""}
                  onChange={(e) => updateForm(slot, currentScope, { logo_src: e.target.value || null })}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div className={styles.fieldRow}>
                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={form.dismissible}
                    onChange={(e) => updateForm(slot, currentScope, { dismissible: e.target.checked })}
                  />
                  Visitor can dismiss
                </label>
                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={form.status === "active"}
                    onChange={(e) =>
                      updateForm(slot, currentScope, { status: e.target.checked ? "active" : "inactive" })
                    }
                  />
                  Active
                </label>
              </div>

              <div className={styles.bannerActions}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={() => handleSave(slot, currentScope)}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                {configured && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => handleClear(slot, currentScope)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
