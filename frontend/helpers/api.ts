import { withDebugIp } from './debugIp';

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

  const res = await fetch(withDebugIp(`${BASE}${path}`), { ...options, headers });

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

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  region: string | null;
  country_code: string | null;
  created_at: string;
  updated_at: string;
}

// Fields any signed-in user (any role) may change about themselves. Email is
// deliberately not part of this shape — it's the account's identity and the
// backend never accepts it here.
export interface UserSelfUpdate {
  name?: string;
  current_password?: string;
  new_password?: string;
}

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

export interface BrokerSlot {
  position: number;
  id: string;
  name: string;
  img_src: string | null;
  cashback_rate: number;
}

export type BrokerSectionKey = "featured" | "sponsored" | "partners" | "more_partners";

export interface HomepageData {
  market_prices: Array<{ symbol: string; price: string; change_pct: string; direction: string }>;
  top_traders: Array<{ id: string; name: string; avatar_initials: string; roi_12m: number; followers: number; win_rate: number; strategy: string; pairs: string[] }>;
  latest_news: Array<{ id: string; title: string; excerpt?: string; cover_image_url?: string; created_at: string }>;
  open_plays: Array<{ id: string; pair: string; direction: string; entry_price: string; take_profit?: string; stop_loss?: string; timeframe?: string; play_type: string; status: string }>;
  latest_analysis: Array<{ id: string; pair: string; timeframe: string; bias: string; summary?: string }>;
  recent_threads: Array<{ id: string; title: string; category: string; author_email: string; reply_count: number; is_pinned: boolean; created_at: string }>;
  broker_sections: Record<BrokerSectionKey, BrokerSlot[]>;
  ad_banners: Record<string, AdBannerContent>;
}

// Coverage scope a placement's order applies to: "default" is the fallback
// order shown when a visitor's detected region has no override, a broker
// geo_coverage region code (e.g. "europe") for a region-specific order, or an
// ISO country code (e.g. "US") to drill down to a single country.
export type BrokerPlacementRegion = string;

export interface BrokerPlacement {
  id: string;
  section: BrokerSectionKey;
  region: BrokerPlacementRegion;
  position: number;
  broker_id: string;
  created_at: string;
  updated_at: string;
}

// ── Ad Placements (per-route CMS: broker-section slots + standalone banner ads) ─

// Routes with configurable ad placements. Add a key here (and on the backend's
// PAGE_BANNER_SLOTS / broker-placement SECTIONS) when another page gets its own
// ad blocks.
export type AdPlacementPage = "homepage" | "signin";

export interface AdBannerContent {
  sponsor_name: string;
  description: string;
  badge_text: string;
  logo_src: string | null;
  link_url: string | null;
  cta_label: string | null;
  // Short feature-bullet strings, e.g. ["FCA · ASIC regulated", "0.0 pip
  // spreads"] — used by richer banner slots like the sign-in featured broker
  // card. Empty for slots that don't use bullets.
  features: string[];
  disclaimer: string | null;
  dismissible: boolean;
}

export interface AdBanner extends AdBannerContent {
  id: string;
  page: AdPlacementPage;
  slot: string;
  // Coverage scope this content targets: "default" (fallback), a broker
  // geo_coverage region code (e.g. "europe"), or an ISO country code — same
  // scope semantics as BrokerPlacementRegion.
  region: BrokerPlacementRegion;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface AdBannerUpsert extends AdBannerContent {
  status: "active" | "inactive";
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
  adBanners: (page: AdPlacementPage) =>
    api.get<Record<string, AdBannerContent>>(`/public/ad-banners/${page}`),
};

export const usersApi = {
  me: () => api.get<UserProfile>('/users/me'),
  updateMe: (payload: UserSelfUpdate) => api.patch<UserProfile>('/users/me', payload),
};

export const brokerPlacementsApi = {
  list: (section?: BrokerSectionKey) =>
    api.get<BrokerPlacement[]>(`/broker-placements/${section ? `?section=${section}` : ''}`),
  set: (section: BrokerSectionKey, region: BrokerPlacementRegion, position: number, brokerId: string) =>
    api.put<BrokerPlacement>(`/broker-placements/${section}/${region}/${position}`, { broker_id: brokerId }),
  clear: (section: BrokerSectionKey, region: BrokerPlacementRegion, position: number) =>
    api.delete<void>(`/broker-placements/${section}/${region}/${position}`),
};

export const adBannersApi = {
  list: (page?: AdPlacementPage) =>
    api.get<AdBanner[]>(`/ad-banners/${page ? `?page=${page}` : ""}`),
  set: (page: AdPlacementPage, slot: string, region: BrokerPlacementRegion, data: AdBannerUpsert) =>
    api.put<AdBanner>(`/ad-banners/${page}/${slot}/${region}`, data),
  clear: (page: AdPlacementPage, slot: string, region: BrokerPlacementRegion) =>
    api.delete<void>(`/ad-banners/${page}/${slot}/${region}`),
};
