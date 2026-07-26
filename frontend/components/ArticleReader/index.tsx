'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { type Article } from '@/helpers/api';
import styles from './ArticleReader.module.scss';

type ArticleReaderProps = {
  section: 'news' | 'analysis';
  articleId: string;
  getArticle: (id: string) => Promise<Article>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function ArticleReader({ section, articleId, getArticle }: ArticleReaderProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getArticle(articleId)
      .then(setArticle)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load this article.'));
  }, [articleId, getArticle]);

  const sectionLabel = section === 'news' ? 'News' : 'Analysis';

  if (error) {
    return (
      <div className={styles.message}>
        <h1>Article unavailable</h1>
        <p>{error}</p>
        <Link href={`/${section}`} className={styles.backLink}>← Back to {sectionLabel}</Link>
      </div>
    );
  }

  if (!article) {
    return <div className={styles.loading}>Loading article…</div>;
  }

  return (
    <article className={styles.article}>
      <Link href={`/${section}`} className={styles.backLink}>← Back to {sectionLabel}</Link>
      <div className={styles.eyebrow}>
        {article.symbol ? `${article.symbol} · ${article.market_category}` : sectionLabel}
      </div>
      <h1 className={styles.title}>{article.title}</h1>
      <div className={styles.meta}>Published {formatDate(article.created_at)} · CBFX Editorial</div>
      {article.cover_image_url && (
        <img className={styles.cover} src={article.cover_image_url} alt="" />
      )}
      {article.excerpt && <p className={styles.excerpt}>{article.excerpt}</p>}
      {article.content && (
        <div className={styles.content} dangerouslySetInnerHTML={{ __html: article.content }} />
      )}
    </article>
  );
}
