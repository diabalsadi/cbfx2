"use client";
import { useState, useEffect, useCallback } from "react";
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

const ROUTES: { value: SeoRoute; label: string; tokens?: string[]; hasSymbols?: boolean }[] = [
  { value: "homepage", label: "Homepage — /" },
  { value: "login", label: "Sign In — /login" },
  { value: "register", label: "Register — /register" },
  { value: "account", label: "Account — /account" },
  { value: "brokers", label: "Brokers — /brokers" },
  { value: "calendar", label: "Calendar — /calendar" },
  { value: "cashback", label: "Cashback — /cashback" },
  { value: "copy_trading", label: "Copy Trading — /copy-trading" },
  { value: "markets", label: "Markets — /markets" },
  { value: "markets_symbol", label: "Market Symbol — /markets/[symbol]", tokens: ["symbol"], hasSymbols: true },
  { value: "analysis", label: "Analysis — /analysis" },
  // analysis_detail and news_detail are deliberately not offered here — each
  // article's own SEO fields (set on its create/edit form) are the primary
  // way to configure its page; the generic templates still exist in the
  // backend as the fallback when an article hasn't set its own.
  { value: "news", label: "News — /news" },
  { value: "forum", label: "Forum — /forum" },
  { value: "forum_detail", label: "Forum Thread — /forum/[id]", tokens: ["title"] },
  { value: "plays", label: "Plays — /plays" },
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load SEO data"));
  }, []);

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
      setError("Title is required");
      return;
    }
    if (!form.description.trim()) {
      setError("Description is required");
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
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!subKey) return;
    if (!confirm(`Remove the override for ${activeSymbol?.label ?? subKey}? It will fall back to the default template.`)) return;
    try {
      await seoApi.clear(route, subKey);
      setByKey((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove override");
    }
  };

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>SEO</h2>
          <p className={styles.subtitle}>
            Control the meta tags every route renders server-side — title, description,
            social share preview, canonical URL and robots directives. Structured data
            (JSON-LD) is generated automatically from each page&apos;s real content.
          </p>
        </div>
        <div className={styles.routeSelectWrap}>
          <label className={styles.routeSelectLabel} htmlFor="seo-route">
            Route
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
            Symbol
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
            <option value="">— Default (all symbols) —</option>
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
                ? "Configured"
                : subKey
                  ? "No override (uses Default)"
                  : "Using site defaults"}
            </span>
          </div>

          {activeRoute.tokens && (
            <p className={styles.tokenHint}>
              This is a dynamic route template — use{" "}
              {activeRoute.tokens.map((t, i) => (
                <span key={t}>
                  {i > 0 && ", "}
                  <code className={styles.token}>{`{${t}}`}</code>
                </span>
              ))}{" "}
              in the title/description and they&apos;ll be filled in with the real page data at
              render time.
            </p>
          )}

          <h4 className={styles.sectionLabel}>Basic SEO</h4>

          <div className={styles.field}>
            <label className={styles.label}>Title *</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => updateForm({ title: e.target.value })}
              placeholder="Page title as it should appear in search results"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description *</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              placeholder="1-2 sentence summary shown under the title in search results"
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Keywords</label>
            <input
              className={styles.input}
              value={form.keywords ?? ""}
              onChange={(e) => updateForm({ keywords: e.target.value || null })}
              placeholder="comma, separated, keywords"
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Canonical Path</label>
              <input
                className={styles.input}
                value={form.canonical_path ?? ""}
                onChange={(e) => updateForm({ canonical_path: e.target.value || null })}
                placeholder={activeRoute.tokens ? "Auto-set to the page's own URL" : "/brokers"}
                disabled={!!activeRoute.tokens}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Robots</label>
              <select
                className={styles.input}
                value={form.robots}
                onChange={(e) => updateForm({ robots: e.target.value })}
              >
                <option value="index, follow">Index, Follow</option>
                <option value="noindex, follow">No Index, Follow</option>
                <option value="index, nofollow">Index, No Follow</option>
                <option value="noindex, nofollow">No Index, No Follow</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>Social Share</h3>
          <p className={styles.sectionHint}>
            Facebook, LinkedIn and Instagram read Open Graph tags; Twitter/X reads its own Card
            tags (falling back to Open Graph for anything left blank). There&apos;s no separate
            tag standard per platform beyond that, so this one set of fields covers all of them.
            Leave blank to use this route&apos;s title/description, or the sitewide defaults
            under Site Settings.
          </p>

          <div className={styles.field}>
            <label className={styles.label}>Share Title</label>
            <input
              className={styles.input}
              value={form.og_title ?? ""}
              onChange={(e) => updateForm({ og_title: e.target.value || null })}
              placeholder="Defaults to Title above"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Share Description</label>
            <textarea
              className={styles.textarea}
              value={form.og_description ?? ""}
              onChange={(e) => updateForm({ og_description: e.target.value || null })}
              placeholder="Defaults to Description above"
              rows={2}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Share Image URL</label>
              <input
                className={styles.input}
                value={form.og_image ?? ""}
                onChange={(e) => updateForm({ og_image: e.target.value || null })}
                placeholder="https://example.com/social-preview.png"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Twitter Card Style</label>
              <select
                className={styles.input}
                value={form.twitter_card}
                onChange={(e) => updateForm({ twitter_card: e.target.value })}
              >
                <option value="summary_large_image">Summary — Large Image</option>
                <option value="summary">Summary</option>
              </select>
            </div>
          </div>
        </Card>

        {saved && <p className={styles.success}>Saved.</p>}

        <div className={styles.formActions}>
          <button className={styles.submitBtn} type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          {subKey && configured && (
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              Remove override
            </button>
          )}
        </div>
      </form>
    </>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<SeoSettingsUpsert>(EMPTY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    seoApi
      .getSettings()
      .then((s) => setSettings(s))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load settings"));
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
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Site Settings</h2>
          <p className={styles.subtitle}>
            Sitewide SEO configuration, applied on every page — search engine verification codes
            and the fallback social share preview used when a route hasn&apos;t set its own.
          </p>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={handleSave} className={styles.form}>
        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>Site Verification</h3>
          <p className={styles.sectionHint}>
            Paste the verification code from each search console — not the full meta tag, just
            the content value.
          </p>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Google Search Console</label>
              <input
                className={styles.input}
                value={settings.google_site_verification ?? ""}
                onChange={(e) => update({ google_site_verification: e.target.value || null })}
                placeholder="Verification code"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Bing Webmaster Tools</label>
              <input
                className={styles.input}
                value={settings.bing_site_verification ?? ""}
                onChange={(e) => update({ bing_site_verification: e.target.value || null })}
                placeholder="Verification code"
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Pinterest</label>
              <input
                className={styles.input}
                value={settings.pinterest_site_verification ?? ""}
                onChange={(e) => update({ pinterest_site_verification: e.target.value || null })}
                placeholder="Verification code"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Facebook Domain Verification</label>
              <input
                className={styles.input}
                value={settings.facebook_domain_verification ?? ""}
                onChange={(e) => update({ facebook_domain_verification: e.target.value || null })}
                placeholder="Verification code"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Keywords</label>
            <input
              className={styles.input}
              value={settings.default_keywords ?? ""}
              onChange={(e) => update({ default_keywords: e.target.value || null })}
              placeholder="Falls back to each route's own keywords if blank"
            />
          </div>
        </Card>

        <Card className={styles.formCard}>
          <h3 className={styles.formTitle}>Social Share Defaults</h3>
          <p className={styles.sectionHint}>
            Used as the Facebook/LinkedIn/Instagram/Twitter share preview for any route that
            hasn&apos;t set its own Social Share fields.
          </p>

          <div className={styles.field}>
            <label className={styles.label}>Twitter/X Handle</label>
            <input
              className={styles.input}
              value={settings.twitter_site ?? ""}
              onChange={(e) => update({ twitter_site: e.target.value || null })}
              placeholder="@cbfx"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Share Title</label>
            <input
              className={styles.input}
              value={settings.default_share_title ?? ""}
              onChange={(e) => update({ default_share_title: e.target.value || null })}
              placeholder="Falls back to each route's own title if blank"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Share Description</label>
            <textarea
              className={styles.textarea}
              value={settings.default_share_description ?? ""}
              onChange={(e) => update({ default_share_description: e.target.value || null })}
              rows={2}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Default Share Image URL</label>
            <input
              className={styles.input}
              value={settings.default_share_image ?? ""}
              onChange={(e) => update({ default_share_image: e.target.value || null })}
              placeholder="https://example.com/default-social-preview.png"
            />
          </div>
        </Card>

        {saved && <p className={styles.success}>Saved.</p>}

        <button className={styles.submitBtn} type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </>
  );
}

export default function SeoAdminPage() {
  const [tab, setTab] = useState<"routes" | "settings">("routes");

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === "routes" ? styles.tabBtnActive : ""}`}
          onClick={() => setTab("routes")}
        >
          Per-Route SEO
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === "settings" ? styles.tabBtnActive : ""}`}
          onClick={() => setTab("settings")}
        >
          Site Settings
        </button>
      </div>

      {tab === "routes" ? <RoutesTab /> : <SettingsTab />}
    </div>
  );
}
