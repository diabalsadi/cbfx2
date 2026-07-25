'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/helpers/api';
import Card from '@/components/Card';
import styles from '../new/NewArticle.module.scss';

const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false });

interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  is_published: boolean;
}

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Article>(`/articles/${id}`)
      .then(a => {
        setArticle(a);
        setTitle(a.title);
        setExcerpt(a.excerpt || '');
        setContent(a.content || '');
        setCoverImageUrl(a.cover_image_url || '');
        setIsPublished(a.is_published);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setError('');
    setSaving(true);
    try {
      await api.put(`/articles/${id}`, {
        title,
        excerpt: excerpt || null,
        content,
        cover_image_url: coverImageUrl || null,
        is_published: isPublished,
      });
      router.push('/admin/articles');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: '40px', textAlign: 'center' }}>Loading article…</p>;
  if (!article) return <p style={{ color: '#ef4444', padding: '40px' }}>Article not found.</p>;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <Link href="/admin/articles" className={styles.back}>← Back to Articles</Link>
          <h2 className={styles.title}>Edit Article</h2>
        </div>
        <div className={styles.actions}>
          <button className={styles.draftBtn} onClick={() => { setIsPublished(false); handleSave(); }} disabled={saving}>
            Save as Draft
          </button>
          <button className={styles.publishBtn} onClick={() => { setIsPublished(true); handleSave(); }} disabled={saving}>
            {saving ? 'Saving…' : 'Save & Publish'}
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
              {coverImageUrl && <img src={coverImageUrl} alt="Cover" className={styles.coverPreview} />}
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.sideLabel}>Published</span>
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
