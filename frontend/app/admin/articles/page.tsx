'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/helpers/api';
import Card from '@/components/Card';
import styles from './Articles.module.scss';
import { useAuth } from '@/contexts/AuthContext';

interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  is_published: boolean;
  article_type: 'news' | 'analysis';
  author_email: string;
  created_at: string;
}

export default function ArticlesPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Article[]>('/articles/')
      .then(setArticles)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    try {
      await api.delete(`/articles/${id}`);
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Articles</h2>
          <p className={styles.subtitle}>Create and manage editorial content.</p>
        </div>
        <Link href="/admin/articles/new" className={styles.addBtn}>+ New Article</Link>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.loadingText}>Loading articles…</p>
      ) : articles.length === 0 ? (
        <Card className={styles.emptyCard}>
          <span className={styles.emptyIcon}>✏️</span>
          <p className={styles.emptyText}>No articles yet.</p>
          <Link href="/admin/articles/new" className={styles.addBtn}>Write your first article</Link>
        </Card>
      ) : (
        <div className={styles.articleList}>
          {articles.map(a => {
            const canEdit = user?.role === 'super_admin' || user?.email === a.author_email;
            const canDelete = user?.role === 'super_admin';
            
            return (
              <Card key={a.id} className={styles.articleCard}>
                <div className={styles.articleMeta}>
                  <span className={a.is_published ? styles.published : styles.draft}>
                    {a.is_published ? 'Published' : 'Draft'}
                  </span>
                  <span className={styles.date}>
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 className={styles.articleTitle}>{a.title}</h3>
                {a.excerpt && <p className={styles.articleExcerpt}>{a.excerpt}</p>}
                <p className={styles.articleAuthor}>By {a.author_email}</p>
                <div className={styles.articleActions}>
                  {canEdit && (
                    <Link href={`/admin/articles/${a.id}`} className={styles.editBtn}>Edit</Link>
                  )}
                  {canDelete && (
                    <button className={styles.deleteBtn} onClick={() => handleDelete(a.id)}>Delete</button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
