"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import { api } from "@/helpers/api";
import Card from "@/components/Card";
import styles from "./NewArticle.module.scss";

const RichEditor = dynamic(() => import("@/components/RichEditor"), {
  ssr: false,
});
const MARKET_CATEGORIES = ["crypto", "forex", "metals", "indices"] as const;
const MARKET_CATEGORY_LABEL_KEY = {
  crypto: "marketCategoryCrypto",
  forex: "marketCategoryForex",
  metals: "marketCategoryMetals",
  indices: "marketCategoryIndices",
} as const;

export default function NewArticlePage() {
  const t = useTranslations("adminArticles");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [articleType, setArticleType] = useState<"news" | "analysis">("news");
  const [marketCategory, setMarketCategory] =
    useState<(typeof MARKET_CATEGORIES)[number]>("crypto");
  const [symbol, setSymbol] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (publish?: boolean) => {
    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    if (articleType === "analysis" && !symbol.trim()) {
      setError(t("symbolRequired"));
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api.post("/articles/", {
        title,
        excerpt: excerpt || null,
        content,
        cover_image_url: coverImageUrl || null,
        article_type: articleType,
        market_category: marketCategory,
        symbol: articleType === "analysis" ? symbol.trim().toUpperCase() : null,
        is_published: publish ?? isPublished,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        meta_keywords: metaKeywords || null,
        og_image: ogImage || null,
      });
      router.push("/admin/articles");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <Link href="/admin/articles" className={styles.back}>
            {t("backToArticles")}
          </Link>
          <h2 className={styles.title}>{t("newPageTitle")}</h2>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.draftBtn}
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {t("saveDraft")}
          </button>
          <button
            className={styles.publishBtn}
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? t("publishing") : t("publish")}
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.layout}>
        <div className={styles.mainArea}>
          <Card className={styles.editorCard}>
            <input
              className={styles.titleInput}
              placeholder={t("articleTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className={styles.excerptInput}
              placeholder={t("excerptPlaceholder")}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
            <RichEditor content={content} onChange={setContent} />
          </Card>
        </div>

        <aside className={styles.sidebar}>
          <Card className={styles.sideCard}>
            <h3 className={styles.sideTitle}>{t("settings")}</h3>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>{t("coverImageUrl")}</label>
              <input
                className={styles.sideInput}
                placeholder={t("coverImageUrlPlaceholder")}
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
              />
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="Cover preview"
                  className={styles.coverPreview}
                />
              )}
            </div>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>{t("articleType")}</label>
              <select
                className={styles.sideInput}
                value={articleType}
                onChange={(e) =>
                  setArticleType(e.target.value as "news" | "analysis")
                }
              >
                <option value="news">{t("news")}</option>
                <option value="analysis">{t("analysis")}</option>
              </select>
            </div>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>{t("marketCategory")}</label>
              <div className={styles.radioGroup}>
                {MARKET_CATEGORIES.map((category) => (
                  <label key={category} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="market-category"
                      value={category}
                      checked={marketCategory === category}
                      onChange={() => setMarketCategory(category)}
                    />
                    <span>{t(MARKET_CATEGORY_LABEL_KEY[category])}</span>
                  </label>
                ))}
              </div>
            </div>
            {articleType === "analysis" && (
              <div className={styles.sideField}>
                <label className={styles.sideLabel}>{t("symbol")}</label>
                <input
                  className={styles.sideInput}
                  placeholder={t("symbolPlaceholder")}
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                />
              </div>
            )}
            <div className={styles.toggleRow}>
              <span className={styles.sideLabel}>{t("publishImmediately")}</span>
              <button
                className={`${styles.toggle} ${isPublished ? styles.toggleOn : ""}`}
                onClick={() => setIsPublished((v) => !v)}
                type="button"
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </Card>

          <Card className={styles.sideCard}>
            <h3 className={styles.sideTitle}>{t("seo")}</h3>
            <p className={styles.sideHint}>{t("seoHint")}</p>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>{t("metaTitle")}</label>
              <input
                className={styles.sideInput}
                placeholder={t("metaTitlePlaceholder")}
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
            </div>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>{t("metaDescription")}</label>
              <input
                className={styles.sideInput}
                placeholder={t("metaDescriptionPlaceholder")}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
            </div>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>{t("keywords")}</label>
              <input
                className={styles.sideInput}
                placeholder={t("keywordsPlaceholder")}
                value={metaKeywords}
                onChange={(e) => setMetaKeywords(e.target.value)}
              />
            </div>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>{t("shareImageUrl")}</label>
              <input
                className={styles.sideInput}
                placeholder={t("shareImageUrlPlaceholder")}
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
              />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
