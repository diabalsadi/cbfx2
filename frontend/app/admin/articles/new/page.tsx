'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/helpers/api';
import Card from '@/components/Card';
import styles from './NewArticle.module.scss';

const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false });
const MARKET_CATEGORIES = ['crypto', 'forex', 'metals', 'indices'] as const;

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [articleType, setArticleType] = useState<'news' | 'analysis'>('news');
  const [marketCategory, setMarketCategory] = useState<(typeof MARKET_CATEGORIES)[number]>('crypto');
  const [symbol, setSymbol] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (publish?: boolean) => {
    if (!title.trim()) { setError('Title is required'); return; }
    if (articleType === 'analysis' && !symbol.trim()) { setError('Analysis articles require a symbol'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post('/articles/', {
        title,
        excerpt: excerpt || null,
        content,
        cover_image_url: coverImageUrl || null,
        article_type: articleType,
        market_category: marketCategory,
        symbol: articleType === 'analysis' ? symbol.trim().toUpperCase() : null,
        is_published: publish ?? isPublished,
      });
      router.push('/admin/articles');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <Link href="/admin/articles" className={styles.back}>← Back to Articles</Link>
          <h2 className={styles.title}>New Article</h2>
        </div>
        <div className={styles.actions}>
          <button className={styles.draftBtn} onClick={() => handleSave(false)} disabled={saving}>
            Save Draft
          </button>
          <button className={styles.publishBtn} onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.layout}>
        <div className={styles.mainArea}>
          <Card className={styles.editorCard}>
            <input
              className={styles.titleInput}
              placeholder="Article title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <input
              className={styles.excerptInput}
              placeholder="Short excerpt (optional)…"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
            />
            <RichEditor content={content} onChange={setContent} />
          </Card>
        </div>

        <aside className={styles.sidebar}>
          <Card className={styles.sideCard}>
            <h3 className={styles.sideTitle}>Settings</h3>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>Cover Image URL</label>
              <input
                className={styles.sideInput}
                placeholder="https://…"
                value={coverImageUrl}
                onChange={e => setCoverImageUrl(e.target.value)}
              />
              {coverImageUrl && (
                <img src={coverImageUrl} alt="Cover preview" className={styles.coverPreview} />
              )}
            </div>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>Article Type</label>
              <select
                className={styles.sideInput}
                value={articleType}
                onChange={e => setArticleType(e.target.value as 'news' | 'analysis')}
              >
                <option value="news">News</option>
                <option value="analysis">Analysis</option>
              </select>
            </div>
            <div className={styles.sideField}>
              <label className={styles.sideLabel}>Market Category</label>
              <div className={styles.radioGroup}>
                {MARKET_CATEGORIES.map(category => (
                  <label key={category} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="market-category"
                      value={category}
                      checked={marketCategory === category}
                      onChange={() => setMarketCategory(category)}
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            </div>
            {articleType === 'analysis' && (
              <div className={styles.sideField}>
                <label className={styles.sideLabel}>Symbol</label>
                <input
                  className={styles.sideInput}
                  placeholder="e.g. BTC/USD or XAU/USD"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                />
              </div>
            )}
            <div className={styles.toggleRow}>
              <span className={styles.sideLabel}>Publish immediately</span>
              <button
                className={`${styles.toggle} ${isPublished ? styles.toggleOn : ''}`}
                onClick={() => setIsPublished(v => !v)}
                type="button"
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
