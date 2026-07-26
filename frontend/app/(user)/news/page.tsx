'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { newsApi, type Article } from '@/helpers/api';
import styles from './news.module.scss';

const CATEGORIES = ['FOREX', 'CRYPTO', 'METALS', 'STOCKS'];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    newsApi.list()
      .then(setArticles)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unable to load news.'))
      .finally(() => setLoading(false));
  }, []);

  const featured = articles[0];
  const latest = articles.slice(1);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <span className={styles.accent}>CBFX</span> News
        </h1>
      </div>

      {loading ? (
        <div className={styles.skeleton}>
          <div className={styles.skeletonFeatured} />
          {[1, 2, 3].map(i => <div key={i} className={styles.skeletonRow} />)}
        </div>
      ) : error ? (
        <p className={styles.empty}>{error}</p>
      ) : articles.length === 0 ? (
        <p className={styles.empty}>No news has been published yet.</p>
      ) : (
        <>
          {/* Featured / breaking */}
          {featured && (
            <Link href={`/news/${featured.id}`} className={styles.featured}>
              <div className={styles.breakingBadge}>🔥 BREAKING</div>
              <h2 className={styles.featuredTitle}>{featured.title}</h2>
              <div className={styles.featuredMeta}>
                2 min read · {timeAgo(featured.created_at)}
              </div>
            </Link>
          )}

          {/* Latest list */}
          <div className={styles.latestSection}>
            <div className={styles.latestLabel}>LATEST</div>
            <div className={styles.list}>
              {latest.map((a, i) => (
                <Link key={a.id} href={`/news/${a.id}`} className={styles.row}>
                  <div className={styles.rowLeft}>
                    <span className={`${styles.cat} ${styles[`cat${i % 4}`]}`}>
                      {CATEGORIES[i % 4]}
                    </span>
                    <span className={styles.rowTime}>· {timeAgo(a.created_at)}</span>
                  </div>
                  <div className={styles.rowTitle}>{a.title}</div>
                  {i < 2 && <span className={styles.hotBadge}>🔥 HOT</span>}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
