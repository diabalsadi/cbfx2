"use client";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  seoApi,
  type SeoMetaUpsert,
  type AdminSeoMeta,
  type SeoSettingsUpsert,
} from "@/helpers/api";
import type { SeoRoute } from "@/helpers/seo";
import { getSymbols, slugifySymbol } from "@/helpers/tradingviewSymbols";
import Card from "@/components/Card";
import styles from "./Seo.module.scss";

function omitMeta(seo: AdminSeoMeta): SeoMetaUpsert {
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    og_title: seo.og_title,
    og_description: seo.og_description,
    og_image: seo.og_image,
    twitter_card: seo.twitter_card,
    canonical_path: seo.canonical_path,
    robots: seo.robots,
  };
}

type RouteLabelKey =
  | "routeHomepage"
  | "routeLogin"
  | "routeRegister"
  | "routeAccount"
  | "routeCalendar"
  | "routeCashback"
  | "routeCopyTrading"
  | "routeMarkets"
  | "routeMarketsSymbol"
  | "routeAnalysis"
  | "routeNews"
  | "routeForum"
  | "routeForumDetail"
  | "routePlays";

const ROUTE_META: { value: SeoRoute; labelKey: RouteLabelKey; path: string; tokens?: string[]; hasSymbols?: boolean }[] = [
  { value: "homepage", labelKey: "routeHomepage", path: "/" },
  { value: "login", labelKey: "routeLogin", path: "/login" },
  { value: "register", labelKey: "routeRegister", path: "/register" },
  { value: "account", labelKey: "routeAccount", path: "/account" },
  { value: "calendar", labelKey: "routeCalendar", path: "/calendar" },
  { value: "cashback", labelKey: "routeCashback", path: "/cashback" },
  { value: "copy_trading", labelKey: "routeCopyTrading", path: "/copy-trading" },
  { value: "markets", labelKey: "routeMarkets", path: "/markets" },
  { value: "markets_symbol", labelKey: "routeMarketsSymbol", path: "/markets/[symbol]", tokens: ["symbol"], hasSymbols: true },
  { value: "analysis", labelKey: "routeAnalysis", path: "/analysis" },
  // analysis_detail and news_detail are deliberately not offered here — each
  // article's own SEO fields (set on its create/edit form) are the primary
  // way to configure its page; the generic templates still exist in the
  // backend as the fallback when an article hasn't set its own.
  { value: "news", labelKey: "routeNews", path: "/news" },
  { value: "forum", labelKey: "routeForum", path: "/forum" },
  { value: "forum_detail", labelKey: "routeForumDetail", path: "/forum/[id]", tokens: ["title"] },
  { value: "plays", labelKey: "routePlays", path: "/plays" },
];

const SYMBOLS = getSymbols().map((s) => ({ value: slugifySymbol(s.displayName), label: s.displayName }));

const EMPTY_FORM: SeoMetaUpsert = {
  title: "",
  description: "",
  keywords: null,
  og_title: null,
  og_description: null,
  og_image: null,
  twitter_card: "summary_large_image",
  canonical_path: null,
  robots: "index, follow",
};

const EMPTY_SETTINGS: SeoSettingsUpsert = {
  google_site_verification: null,
  bing_site_verification: null,
  pinterest_site_verification: null,
  facebook_domain_verification: null,
  twitter_site: null,
  default_share_title: null,
  default_share_description: null,
  default_share_image: null,
  default_keywords: null,
};

function recordKey(route: SeoRoute, subKey: string) {
  return `${route}::${subKey}`;
}

function RoutesTab() {
  const t = useTranslations("adminSeo");
  const ROUTES = ROUTE_META.map((r) => ({
    ...r,
    label: `${t(r.labelKey)} — ${r.path}`,
  }));
  const [route, setRoute] = useState<SeoRoute>(ROUTES[0].value);
  const [subKey, setSubKey] = useState("");
  const [byKey, setByKey] = useState<Record<string, SeoMetaUpsert>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = useCallback(() => {
    seoApi
      .list()
      .then((list) => {
        const map: Record<string, SeoMetaUpsert> = {};
        list.forEach((s) => {
          map[recordKey(s.route as SeoRoute, s.sub_key)] = omitMeta(s);
        });
        setByKey(map);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("loadFailed")));
  }, [t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const activeRoute = ROUTES.find((r) => r.value === route) ?? ROUTES[0];
  const key = recordKey(route, subKey);
  const form = byKey[key] ?? EMPTY_FORM;
  const configured = !!byKey[key];
  const activeSymbol = SYMBOLS.find((s) => s.value === subKey);

  const selectRoute = (next: SeoRoute) => {
    setRoute(next);
    setSubKey("");
    setSaved(false);
    setError("");
  };

  const updateForm = (patch: Partial<SeoMetaUpsert>) => {
    setByKey((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY_FORM), ...patch } }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    if (!form.description.trim()) {
      setError(t("descriptionRequired"));
      return;
    }
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const result = await seoApi.set(route, form, subKey || undefined);
      setByKey((prev) => ({ ...prev, [key]: omitMeta(result) }));
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!subKey) return;
    if (!confirm(t("removeConfirm", { label: activeSymbol?.label ?? subKey }))) return;
    try {
      await seoApi.clear(route, subKey);
      setByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("removeFailed"));
    }
  };

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("routesTitle")}</h2>
          <p className={styles.subtitle}>{t("routesSubtitle")}</p>
        </div>
        <div className={styles.routeSelectWrap}>
          <label className={styles.routeSelectLabel} htmlFor="seo-route">
            {t("route")}
          </label>
          <select
            id="seo-route"
            className={styles.routeSelect}
            value={route}
            onChange={(e) => selectRoute(e.target.value as SeoRoute)}
          >
            {ROUTES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeRoute.hasSymbols && (
        <div className={styles.routeSelectWrap}>
          <label className={styles.routeSelectLabel} htmlFor="seo-symbol">
            {t("symbol")}
          </label>
          <select
            id="seo-symbol"
            className={styles.routeSelect}
            value={subKey}
            onChange={(e) => {
              setSubKey(e.target.value);
              setSaved(false);
              setError("");
            }}
          >
            <option value="">{t("defaultAllSymbols")}</option>
            {SYMBOLS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={handleSave} className={styles.form}>
        <Card className={styles.formCard}>
          <div className={styles.formCardHeader}>
            <h3 className={styles.formTitle}>
              {activeRoute.label}
              {activeSymbol ? ` — ${activeSymbol.label}` : ""}
            </h3>
            <span className={`${styles.statusBadge} ${configured ? styles.active : ""}`}>
              {configured
                ? t("configured")
                : subKey
                  ? t("noOverride")
                  : t("usingSiteDefaults")}
            </span>
          </div>

          {activeRoute.tokens && (
            <p className={styles.tokenHint}>
              {t("tokenHintPrefix")}{" "}
              {activeRoute.tokens.map((tok, i) => (
                <span key={tok}>
                  {i > 0 && ", "}
                  <code className={styles.token}>{`{${tok}}`}</code>
                </span>
              ))}{" "}
              {t("tokenHintSuffix")}
            </p>
          )}

          <h4 className={styles.sectionLabel}>{t("basicSeo")}</h4>

          <div className={styles.field}>
            <label className={styles.label}>{t("titleLabel")}</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => updateForm({ title: e.target.value })}
              placeholder={t("titlePlaceholder")}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("descriptionLabel")}</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              placeholder={t("descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("keywords")}</label>
            <input
              className={styles.input}
              value={form.keywords ?? ""}
              onChange={(e) => updateForm({ keywords: e.target.value || null })}
              placeholder={t("keywordsPlaceholder")}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t("canonicalPath")}</label>
              <input
                className={styles.input}
                value={form.canonical_path ?? ""}
                onChange={(e) => updateForm({ canonical_path: e.target.value || null })}
                placeholder={activeRoute.tokens ? t("canonicalAutoSet") : "/brokers"}
                disabled={!!activeRoute.tokens}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("robots")}</label>
              <select
                className={styles.input}
                value={form.robots}
                onChange={(e) => updateForm({ robots: e.target.value })}
              >
                <option value="index, follow">{t("robotsIndexFollow")}</option>
                <option value="noindex, follow">{t("robotsNoindexFollow")}</option>
                <option value="index, nofollow">{t("robotsIndexNofollow")}</option>
                <option value="noindex, nofollow">{t("robotsNoindexNofollow")}</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("socialShare")}</h3>
          <p className={styles.sectionHint}>{t("socialShareHint")}</p>

          <div className={styles.field}>
            <label className={styles.label}>{t("shareTitle")}</label>
            <input
              className={styles.input}
              value={form.og_title ?? ""}
              onChange={(e) => updateForm({ og_title: e.target.value || null })}
              placeholder={t("shareTitlePlaceholder")}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("shareDescription")}</label>
            <textarea
              className={styles.textarea}
              value={form.og_description ?? ""}
              onChange={(e) => updateForm({ og_description: e.target.value || null })}
              placeholder={t("shareDescriptionPlaceholder")}
              rows={2}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t("shareImageUrl")}</label>
              <input
                className={styles.input}
                value={form.og_image ?? ""}
                onChange={(e) => updateForm({ og_image: e.target.value || null })}
                placeholder={t("shareImageUrlPlaceholder")}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("twitterCardStyle")}</label>
              <select
                className={styles.input}
                value={form.twitter_card}
                onChange={(e) => updateForm({ twitter_card: e.target.value })}
              >
                <option value="summary_large_image">{t("twitterSummaryLarge")}</option>
                <option value="summary">{t("twitterSummary")}</option>
              </select>
            </div>
          </div>
        </Card>

        {saved && <p className={styles.success}>{t("saved")}</p>}

        <div className={styles.formActions}>
          <button className={styles.submitBtn} type="submit" disabled={saving}>
            {saving ? t("saving") : t("saveChanges")}
          </button>
          {subKey && configured && (
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              {t("removeOverride")}
            </button>
          )}
        </div>
      </form>
    </>
  );
}

function SettingsTab() {
  const t = useTranslations("adminSeo");
  const [settings, setSettings] = useState<SeoSettingsUpsert>(EMPTY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    seoApi
      .getSettings()
      .then((s) => setSettings(s))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t("settingsLoadFailed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<SeoSettingsUpsert>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const result = await seoApi.setSettings(settings);
      setSettings(result);
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("settingsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>{t("siteSettingsTitle")}</h2>
          <p className={styles.subtitle}>{t("siteSettingsSubtitle")}</p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={handleSave} className={styles.form}>
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("siteVerification")}</h3>
          <p className={styles.sectionHint}>{t("siteVerificationHint")}</p>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t("googleSearchConsole")}</label>
              <input
                className={styles.input}
                value={settings.google_site_verification ?? ""}
                onChange={(e) => update({ google_site_verification: e.target.value || null })}
                placeholder={t("verificationCodePlaceholder")}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("bingWebmaster")}</label>
              <input
                className={styles.input}
                value={settings.bing_site_verification ?? ""}
                onChange={(e) => update({ bing_site_verification: e.target.value || null })}
                placeholder={t("verificationCodePlaceholder")}
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t("pinterest")}</label>
              <input
                className={styles.input}
                value={settings.pinterest_site_verification ?? ""}
                onChange={(e) => update({ pinterest_site_verification: e.target.value || null })}
                placeholder={t("verificationCodePlaceholder")}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t("facebookDomainVerification")}</label>
              <input
                className={styles.input}
                value={settings.facebook_domain_verification ?? ""}
                onChange={(e) => update({ facebook_domain_verification: e.target.value || null })}
                placeholder={t("verificationCodePlaceholder")}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("defaultKeywords")}</label>
            <input
              className={styles.input}
              value={settings.default_keywords ?? ""}
              onChange={(e) => update({ default_keywords: e.target.value || null })}
              placeholder={t("defaultKeywordsPlaceholder")}
            />
          </div>
        </Card>

        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>{t("socialShareDefaults")}</h3>
          <p className={styles.sectionHint}>{t("socialShareDefaultsHint")}</p>

          <div className={styles.field}>
            <label className={styles.label}>{t("twitterHandle")}</label>
            <input
              className={styles.input}
              value={settings.twitter_site ?? ""}
              onChange={(e) => update({ twitter_site: e.target.value || null })}
              placeholder="@cbfx"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("defaultShareTitle")}</label>
            <input
              className={styles.input}
              value={settings.default_share_title ?? ""}
              onChange={(e) => update({ default_share_title: e.target.value || null })}
              placeholder={t("defaultShareTitlePlaceholder")}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("defaultShareDescription")}</label>
            <textarea
              className={styles.textarea}
              value={settings.default_share_description ?? ""}
              onChange={(e) => update({ default_share_description: e.target.value || null })}
              rows={2}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t("defaultShareImageUrl")}</label>
            <input
              className={styles.input}
              value={settings.default_share_image ?? ""}
              onChange={(e) => update({ default_share_image: e.target.value || null })}
              placeholder={t("defaultShareImageUrlPlaceholder")}
            />
          </div>
        </Card>

        {saved && <p className={styles.success}>{t("saved")}</p>}

        <button className={styles.submitBtn} type="submit" disabled={saving}>
          {saving ? t("saving") : t("saveChanges")}
        </button>
      </form>
    </>
  );
}

export default function SeoAdminPage() {
  const t = useTranslations("adminSeo");
  const [tab, setTab] = useState<"routes" | "settings">("routes");

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === "routes" ? styles.tabBtnActive : ""}`}
          onClick={() => setTab("routes")}
        >
          {t("perRouteSeoTab")}
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === "settings" ? styles.tabBtnActive : ""}`}
          onClick={() => setTab("settings")}
        >
          {t("siteSettingsTitle")}
        </button>
      </div>

      {tab === "routes" ? <RoutesTab /> : <SettingsTab />}
    </div>
  );
}
