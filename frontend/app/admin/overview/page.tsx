'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/helpers/api';
import Card from '@/components/Card';
import styles from './Overview.module.scss';

interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_budget: number;
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  ctr: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  spend: number;
  budget: number;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const role = user?.role || '';
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'super_admin' || role === 'broker') {
      Promise.all([
        api.get<CampaignStats>('/campaigns/stats').catch(() => null),
        api.get<Campaign[]>('/campaigns/').catch(() => []),
      ]).then(([s, c]) => {
        setStats(s);
        setCampaigns((c as Campaign[]).slice(0, 5));
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [role]);

  const fmt = (n: number) => n.toLocaleString('en-US');
  const fmtCurr = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className={styles.container}>
      {/* Stats row - broker/super admin */}
      {(role === 'broker' || role === 'super_admin') && (
        <>
          <div className={styles.statsGrid}>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Total Campaigns</span>
              <span className={styles.statValue}>{loading ? '—' : fmt(stats?.total_campaigns ?? 0)}</span>
              <span className={styles.statSub}>{stats?.active_campaigns ?? 0} active</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Total Impressions</span>
              <span className={styles.statValue}>{loading ? '—' : fmt(stats?.total_impressions ?? 0)}</span>
              <span className={styles.statSub}>Across all campaigns</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Total Clicks</span>
              <span className={styles.statValue}>{loading ? '—' : fmt(stats?.total_clicks ?? 0)}</span>
              <span className={styles.statSub}>CTR: {stats?.ctr ?? 0}%</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Total Spend</span>
              <span className={styles.statValue}>{loading ? '—' : fmtCurr(stats?.total_spend ?? 0)}</span>
              <span className={styles.statSub}>Budget: {fmtCurr(stats?.total_budget ?? 0)}</span>
            </Card>
          </div>

          <div className={styles.grid2}>
            <Card className={styles.campaignCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Recent Campaigns</h2>
                <Link href="/admin/ads-campaigns" className={styles.seeAll}>See all →</Link>
              </div>
              {loading ? (
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</span>
              ) : campaigns.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>No campaigns yet.</span>
              ) : campaigns.map(c => (
                <div key={c.id} className={styles.campaignRow}>
                  <span className={styles.campaignName}>{c.name}</span>
                  <span className={`${styles.campaignStatus} ${styles[c.status] || ''}`}>{c.status}</span>
                </div>
              ))}
            </Card>

            <Card>
              <h2 className={styles.sectionTitle}>Quick Actions</h2>
              <div className={styles.quickActions}>
                <Link href="/admin/ads-campaigns" className={styles.actionBtn}>
                  <span>◉</span><span>New Campaign</span>
                </Link>
                <Link href="/admin/clients" className={styles.actionBtn}>
                  <span>◫</span><span>Add Client</span>
                </Link>
                <Link href="/admin/reports" className={styles.actionBtn}>
                  <span>▣</span><span>Reports</span>
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Editor view */}
      {role === 'editor' && (
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <span className={styles.statLabel}>Welcome</span>
            <span className={styles.statValue} style={{ fontSize: 22 }}>{user?.name || user?.email}</span>
            <span className={styles.statSub}>Editor account</span>
          </Card>
          <Link href="/admin/articles/new" className={styles.actionBtn} style={{ textDecoration: 'none' }}>
            <span>✏️</span><span>Write New Article</span>
          </Link>
          <Link href="/admin/articles" className={styles.actionBtn} style={{ textDecoration: 'none' }}>
            <span>◎</span><span>My Articles</span>
          </Link>
        </div>
      )}
    </div>
  );
}
