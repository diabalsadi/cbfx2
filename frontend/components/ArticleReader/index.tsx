"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import DOMPurify from "dompurify";
import { type Article } from "@/helpers/api";
import styles from "./ArticleReader.module.scss";

type ArticleReaderProps = {
  section: "news" | "analysis";
  articleId: string;
  getArticle: (id: string) => Promise<Article>;
};

export default function ArticleReader({
  section,
  articleId,
  getArticle,
}: ArticleReaderProps) {
  const t = useTranslations("articleReader");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getArticle(articleId)
      .then(setArticle)
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : t("unavailableTitle"),
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, getArticle]);

  const sectionLabel = section === "news" ? tNav("news") : tNav("analysis");
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));

  if (error) {
    return (
      <div className={styles.message}>
        <h1>{t("unavailableTitle")}</h1>
        <p>{error}</p>
        <Link href={`/${section}`} className={styles.backLink}>
          {t("backTo", { section: sectionLabel })}
        </Link>
      </div>
    );
  }

  if (!article) {
    return <div className={styles.loading}>{t("loading")}</div>;
  }

  return (
    <article className={styles.article}>
      <Link href={`/${section}`} className={styles.backLink}>
        {t("backTo", { section: sectionLabel })}
      </Link>
      <div className={styles.eyebrow}>
        {article.symbol
          ? `${article.symbol} · ${article.market_category}`
          : sectionLabel}
      </div>
      <h1 className={styles.title}>{article.title}</h1>
      <div className={styles.meta}>
        {t("published", { date: formatDate(article.created_at) })}
      </div>
      {article.cover_image_url && (
        <img className={styles.cover} src={article.cover_image_url} alt="" />
      )}
      {article.excerpt && <p className={styles.excerpt}>{article.excerpt}</p>}
      {article.content && (
        <div
          className={styles.content}
          // article.content is editor/super_admin-authored rich-text HTML.
          // Sanitized here as a client-side backstop even though the
          // writer role is already trusted, since this renders for every
          // site visitor with no other check in between.
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
        />
      )}
    </article>
  );
}
