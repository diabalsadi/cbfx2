const BASE = '/api/proxy';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cbfx_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiUpload<T>(path: string, formData: FormData, method: 'POST' | 'PUT' | 'PATCH' = 'POST'): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cbfx_token') : null;
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: formData });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MarketPrice {
  id: string;
  symbol: string;
  price: string;
  change_pct: string;
  direction: 'up' | 'down';
  updated_at: string;
}

export interface CopyTrader {
  id: string;
  name: string;
  avatar_initials: string;
  bio?: string;
  roi_12m: number;
  roi_3m: number;
  roi_1m: number;
  followers: number;
  win_rate: number;
  drawdown: number;
  strategy: 'Scalping' | 'Swing' | 'Position';
  pairs: string[];
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Play {
  id: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  entry_price: string;
  take_profit?: string;
  stop_loss?: string;
  timeframe?: string;
  play_type: string;
  status: 'open' | 'closed' | 'cancelled';
  notes?: string;
  author_email: string;
  opened_at: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  pair: string;
  timeframe: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  summary?: string;
  author_email: string;
  created_at: string;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  cover_image_url?: string;
  is_published: boolean;
  author_email: string;
  created_at: string;
  updated_at: string;
}

export interface Article extends NewsArticle {
  article_type: 'news' | 'analysis';
  market_category: 'crypto' | 'forex' | 'metals' | 'indices' | null;
  symbol: string | null;
}

export interface ForumThread {
  id: string;
  title: string;
  body?: string;
  category: string;
  author_email: string;
  reply_count: number;
  image_url?: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface ForumReply {
  id: string;
  thread_id: string;
  body: string;
  image_url?: string;
  author_email: string;
  created_at: string;
}

export interface ForumThreadDetail extends ForumThread {
  replies: ForumReply[];
}

export interface HomepageData {
  market_prices: Array<{ symbol: string; price: string; change_pct: string; direction: string }>;
  top_traders: Array<{ id: string; name: string; avatar_initials: string; roi_12m: number; followers: number; win_rate: number; strategy: string; pairs: string[] }>;
  latest_news: Array<{ id: string; title: string; excerpt?: string; cover_image_url?: string; created_at: string }>;
  open_plays: Array<{ id: string; pair: string; direction: string; entry_price: string; take_profit?: string; stop_loss?: string; timeframe?: string; play_type: string; status: string }>;
  latest_analysis: Array<{ id: string; pair: string; timeframe: string; bias: string; summary?: string }>;
  recent_threads: Array<{ id: string; title: string; category: string; author_email: string; reply_count: number; is_pinned: boolean; created_at: string }>;
}

// ── Domain APIs ────────────────────────────────────────────────────────────────

export const marketPricesApi = {
  list: () => api.get<MarketPrice[]>('/market-prices'),
};

export const copyTradersApi = {
  list: (params?: { strategy?: string; pair?: string; sort_by?: string }) => {
    const qs = new URLSearchParams();
    if (params?.strategy) qs.set('strategy', params.strategy);
    if (params?.pair) qs.set('pair', params.pair);
    if (params?.sort_by) qs.set('sort_by', params.sort_by);
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<CopyTrader[]>(`/copy-traders${query}`);
  },
  get: (id: string) => api.get<CopyTrader>(`/copy-traders/${id}`),
};

export const playsApi = {
  listOpen: (playType?: string) => {
    const query = playType ? `?play_type=${encodeURIComponent(playType)}` : '';
    return api.get<Play[]>(`/plays${query}`);
  },
};

export const analysisApi = {
  list: () => api.get<Analysis[]>('/analysis'),
};

export const newsApi = {
  list: () => api.get<Article[]>('/public/articles'),
  get: (id: string) => api.get<Article>(`/public/articles/${id}`),
};

export const articlesApi = {
  listAnalysis: () => api.get<Article[]>('/public/analysis'),
  getAnalysis: (id: string) => api.get<Article>(`/public/analysis/${id}`),
};

export const forumApi = {
  listThreads: (params?: { category?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.offset != null) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs}` : '';
    return api.get<ForumThread[]>(`/forum/threads${query}`);
  },
  getThread: (id: string) => api.get<ForumThreadDetail>(`/forum/threads/${id}`),
  createThread: (data: FormData) => apiUpload<ForumThread>('/forum/threads', data),
  createReply: (threadId: string, data: FormData) => apiUpload<ForumReply>(`/forum/threads/${threadId}/replies`, data),
  deleteThread: (id: string) => api.delete<void>(`/forum/threads/${id}`),
  deleteReply: (replyId: string) => api.delete<void>(`/forum/replies/${replyId}`),
};

export const publicApi = {
  homepage: () => api.get<HomepageData>('/public/homepage'),
};
