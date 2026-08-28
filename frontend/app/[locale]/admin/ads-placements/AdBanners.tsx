"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  api,
  adBannersApi,
  type AdPlacementPage,
  type AdBanner,
  type AdBannerUpsert,
  type BrokerPlacementRegion,
} from "@/helpers/api";
import { REGIONS, REGION_LABELS } from "@/helpers/regions";
import { COUNTRIES, COUNTRY_LABELS, COUNTRY_TO_REGION } from "@/helpers/countries";
import { locales } from "@/i18n/routing";
import Card from "@/components/Card";
import styles from "./AdBanners.module.scss";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  fa: "فارسی",
  pt: "Português",
  zh: "中文",
  vi: "Tiếng Việt",
  hi: "हिन्दी",
};

const SLOT_LABEL_KEY = {
  homepage: [
    { key: "sticky_top_banner", labelKey: "slotStickyTopBanner" },
    { key: "sidebar_left_banner", labelKey: "slotSidebarLeftBanner" },
    { key: "sidebar_right_banner", labelKey: "slotSidebarRightBanner" },
    { key: "pre_cashback_banner", labelKey: "slotPreCashbackBanner" },
    { key: "pre_copytrading_banner", labelKey: "slotPreCopytradingBanner" },
    { key: "pre_signals_banner", labelKey: "slotPreSignalsBanner" },
    { key: "pre_markets_banner", labelKey: "slotPreMarketsBanner" },
  ],
  signin: [{ key: "featured_broker", labelKey: "slotFeaturedBrokerSignin" }],
} as const satisfies Record<AdPlacementPage, { key: string; labelKey: string }[]>;

type ScopeMode = "default" | "region" | "country";

interface BrokerOption {
  id: string;
  name: string;
}

const EMPTY_FORM: AdBannerUpsert = {
  broker_id: "",
  images: {},
  default_image_url: null,
  link_url: null,
  dismissible: false,
  status: "active",
};

function toForm(b: AdBanner): AdBannerUpsert {
  return {
    broker_id: b.broker_id,
    images: b.images,
    default_image_url: b.default_image_url,
    link_url: b.link_url,
    dismissible: b.dismissible,
    status: b.status,
  };
}

function formKey(slot: string, scope: BrokerPlacementRegion) {
  return `${slot}::${scope}`;
}

type BySlotRegion = Record<string, Partial<Record<BrokerPlacementRegion, AdBanner>>>;

export default function AdBanners({ page }: { page: AdPlacementPage }) {
  const t = useTranslations("adminAdsPlacements");
  const [brokers, setBrokers] = useState<BrokerOption[]>([]);
  const [bySlotRegion, setBySlotRegion] = useState<BySlotRegion>({});
  const [mode, setMode] = useState<Record<string, ScopeMode>>({});
  const [scope, setScope] = useState<Record<string, BrokerPlacementRegion>>({});
  const [forms, setForms] = useState<Record<string, AdBannerUpsert>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [countryRegionFilter, setCountryRegionFilter] = useState<Record<string, string>>({});
  const [countrySearch, setCountrySearch] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const slots = SLOT_LABEL_KEY[page] ?? [];

  const scopeLabel = (scope: BrokerPlacementRegion): string => {
    if (scope === "default") return t("scopeDefault");
    return REGION_LABELS[scope] || COUNTRY_LABELS[scope] || scope;
  };

  useEffect(() => {
    api
      .get<BrokerOption[]>("/brokers/")
      .then(setBrokers)
      .catch(() => setBrokers([]));
  }, []);

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

  const updateImage = (slot: string, scopeValue: BrokerPlacementRegion, locale: string, url: string) => {
    const form = getForm(slot, scopeValue);
    const images = { ...form.images };
    if (url.trim()) {
      images[locale] = url.trim();
    } else {
      delete images[locale];
    }
    updateForm(slot, scopeValue, { images });
  };

  const handleSave = async (slot: string, scopeValue: BrokerPlacementRegion) => {
    const key = formKey(slot, scopeValue);
    const form = forms[key] ?? getForm(slot, scopeValue);
    if (!form.broker_id) {
      alert(t("brokerRequired"));
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
      alert(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleClear = async (slot: string, scopeValue: BrokerPlacementRegion) => {
    if (!confirm(t("removeConfirm", { scope: scopeLabel(scopeValue) }))) return;
    try {
      await adBannersApi.clear(page, slot, scopeValue);
      setBySlotRegion((prev) => {
        const bySlot = { ...(prev[slot] ?? {}) };
        delete bySlot[scopeValue];
        return { ...prev, [slot]: bySlot };
      });
      setForms((prev) => ({ ...prev, [formKey(slot, scopeValue)]: { ...EMPTY_FORM } }));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t("removeFailed"));
    }
  };

  return (
    <Card className={styles.container}>
      <div>
        <h3 className={styles.title}>{t("bannerAdsTitle")}</h3>
        <p className={styles.subtitle}>{t("bannerAdsSubtitle")}</p>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        {slots.map(({ key: slot, labelKey }) => {
          const label = t(labelKey);
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
                      ? t("active")
                      : t("inactive")
                    : currentScope === "default"
                      ? t("notConfigured")
                      : t("noOverride")}
                </span>
              </div>

              <div className={styles.scopeModeToggle}>
                <button
                  type="button"
                  className={`${styles.scopeModeBtn} ${currentMode === "default" ? styles.scopeModeBtnActive : ""}`}
                  onClick={() => selectMode(slot, "default")}
                >
                  {t("modeDefault")}
                </button>
                <button
                  type="button"
                  className={`${styles.scopeModeBtn} ${currentMode === "region" ? styles.scopeModeBtnActive : ""}`}
                  onClick={() => selectMode(slot, "region")}
                >
                  {t("modeByRegion")}
                </button>
                <button
                  type="button"
                  className={`${styles.scopeModeBtn} ${currentMode === "country" ? styles.scopeModeBtnActive : ""}`}
                  onClick={() => selectMode(slot, "country")}
                >
                  {t("modeByCountry")}
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
                      aria-label={t("filterCountriesAriaLabel", { label })}
                    >
                      <option value="all">{t("allRegions")}</option>
                      {REGIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className={styles.countrySearchInput}
                      placeholder={t("searchCountriesPlaceholder")}
                      value={search}
                      onChange={(e) => setCountrySearch((prev) => ({ ...prev, [slot]: e.target.value }))}
                    />
                  </div>
                  <div className={styles.countryDropdownList}>
                    {filteredCountries.length === 0 ? (
                      <div className={styles.countryDropdownEmpty}>{t("noMatches")}</div>
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
                {t("editingContentFor")} <strong>{scopeLabel(currentScope)}</strong>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>{t("broker")}</label>
                <select
                  className={styles.input}
                  value={form.broker_id}
                  onChange={(e) => updateForm(slot, currentScope, { broker_id: e.target.value })}
                >
                  <option value="" disabled>
                    {t("selectBroker")}
                  </option>
                  {brokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>{t("linkUrl")}</label>
                <input
                  className={styles.input}
                  value={form.link_url ?? ""}
                  onChange={(e) => updateForm(slot, currentScope, { link_url: e.target.value || null })}
                  placeholder={t("linkUrlPlaceholder")}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>{t("defaultImage")}</label>
                <p className={styles.imagesHint}>{t("defaultImageHint")}</p>
                {form.default_image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.default_image_url} alt="" className={styles.imageThumb} />
                )}
                <input
                  className={styles.input}
                  value={form.default_image_url ?? ""}
                  onChange={(e) =>
                    updateForm(slot, currentScope, { default_image_url: e.target.value || null })
                  }
                  placeholder={t("imageUrlPlaceholder")}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>{t("bannerImages")}</label>
                <p className={styles.imagesHint}>{t("bannerImagesHint")}</p>
                <div className={styles.imageList}>
                  {locales.map((loc) => (
                    <div key={loc} className={styles.imageRow}>
                      <span className={styles.imageLocaleLabel}>{LOCALE_LABELS[loc] ?? loc}</span>
                      {form.images[loc] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.images[loc]} alt="" className={styles.imageThumb} />
                      )}
                      <input
                        className={styles.input}
                        value={form.images[loc] ?? ""}
                        onChange={(e) => updateImage(slot, currentScope, loc, e.target.value)}
                        placeholder={t("imageUrlPlaceholder")}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.fieldRow}>
                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={form.dismissible}
                    onChange={(e) => updateForm(slot, currentScope, { dismissible: e.target.checked })}
                  />
                  {t("visitorCanDismiss")}
                </label>
                <label className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    checked={form.status === "active"}
                    onChange={(e) =>
                      updateForm(slot, currentScope, { status: e.target.checked ? "active" : "inactive" })
                    }
                  />
                  {t("active")}
                </label>
              </div>

              <div className={styles.bannerActions}>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={() => handleSave(slot, currentScope)}
                  disabled={isSaving}
                >
                  {isSaving ? t("saving") : t("save")}
                </button>
                {configured && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => handleClear(slot, currentScope)}
                  >
                    {t("remove")}
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
