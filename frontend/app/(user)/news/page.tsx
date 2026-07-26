'use client';
import { useEffect, useState } from 'react';
import styles from './news.module.scss';

type Article = {
  id: string;
  title: string;
  excerpt: string | null;
  created_at: string;
  author_email: string;
  is_published: boolean;
};

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

const MOCK_ARTICLES: Article[] = [
  { id: '1', title: 'USD weakens as Fed signals cut window in Q3', excerpt: 'Dollar slips against majors after Fed minutes hint at September pivot.', created_at: new Date(Date.now() - 12 * 60000).toISOString(), author_email: 'editor@cbfx.com', is_published: true },
  { id: '2', title: 'Bitcoin ETFs see record weekly inflows', excerpt: 'Spot Bitcoin ETFs attract $2.1B in a single week, signaling renewed institutional appetite.', created_at: new Date(Date.now() - 60 * 60000).toISOString(), author_email: 'editor@cbfx.com', is_published: true },
  { id: '3', title: 'Gold pushes to 2-week high on geopolitics', excerpt: 'Safe-haven demand lifts XAU/USD above $2,350 as tensions escalate.', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), author_email: 'editor@cbfx.com', is_published: true },
  { id: '4', title: 'Tech leads rally, semis hit fresh highs', excerpt: 'Nasdaq surges 1.2% as semiconductor sector breaks out to all-time highs.', created_at: new Date(Date.now() - 3 * 3600000).toISOString(), author_email: 'editor@cbfx.com', is_published: true },
  { id: '5', title: 'EUR sees support from PMI surprise', excerpt: 'Euro climbs after Eurozone PMI beats forecasts for third consecutive month.', created_at: new Date(Date.now() - 5 * 3600000).toISOString(), author_email: 'editor@cbfx.com', is_published: true },
];

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/proxy/public/articles')
      .then(r => r.ok ? r.json() : [])
      .then((data: Article[]) => {
        // Merge real articles with mock ones; real articles come first
        const merged = [...data, ...MOCK_ARTICLES].slice(0, 10);
        setArticles(merged);
      })
      .catch(() => setArticles(MOCK_ARTICLES))
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
      ) : (
        <>
          {/* Featured / breaking */}
          {featured && (
            <div className={styles.featured}>
              <div className={styles.breakingBadge}>🔥 BREAKING</div>
              <h2 className={styles.featuredTitle}>{featured.title}</h2>
              <div className={styles.featuredMeta}>
                2 min read · {timeAgo(featured.created_at)}
              </div>
            </div>
          )}

          {/* Latest list */}
          <div className={styles.latestSection}>
            <div className={styles.latestLabel}>LATEST</div>
            <div className={styles.list}>
              {latest.map((a, i) => (
                <div key={a.id} className={styles.row}>
                  <div className={styles.rowLeft}>
                    <span className={`${styles.cat} ${styles[`cat${i % 4}`]}`}>
                      {CATEGORIES[i % 4]}
                    </span>
                    <span className={styles.rowTime}>· {timeAgo(a.created_at)}</span>
                  </div>
                  <div className={styles.rowTitle}>{a.title}</div>
                  {i < 2 && <span className={styles.hotBadge}>🔥 HOT</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
