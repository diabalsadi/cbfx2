import { withDebugIp } from './debugIp';
import type { SeoRoute } from './seo';
import { locales } from '@/i18n/routing';

const BASE = '/api/proxy';

// The active locale lives in the URL path (e.g. /ar/markets), not in any
// client state — reading it straight from window.location keeps apiFetch a
// plain function callable from anywhere, with no provider/hook plumbing
// needed at every call site. Server-side callers (generateMetadata, etc.)
// have no window and fall back to no header, which the backend's
// detect_locale() treats the same as an unset/unsupported locale — the
// visitor's IP-geolocation default.
function currentLocale(): string | null {
  if (typeof window === 'undefined') return null;
  const first = window.location.pathname.split('/')[1];
  return (locales as readonly string[]).includes(first) ? first : null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cbfx_token') : null;
  const locale = currentLocale();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(locale ? { 'X-Locale': locale } : {}),
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
  referral_code: string | null;
  referred_by: string | null;
  must_change_password: boolean;
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

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  // At least one — a user can have several MT5 accounts, even with the same
  // broker, so registration links all of them in one request.
  accounts: { broker_id: string; mt5_number: string }[];
  // Optional referral code from a client's referral link (?ref=CODE).
  // Unknown/invalid codes are ignored server-side rather than rejected.
  referral_code?: string;
  // Required only to replace an email's still-unexpired pending
  // registration (e.g. resubmitting after "Go back" to fix a typo) — the
  // registration_token an earlier register() call for this email returned.
  registration_token?: string;
  // reCAPTCHA v2 response token from the widget on the signup form.
  captcha_token: string;
}

// A broker as returned by the public, geo-filtered listing — only active
// brokers whose coverage includes the visitor's detected region/country.
export interface PublicBroker {
  id: string;
  name: string;
  img_src: string | null;
  coverage_type: 'region' | 'country';
  geo_coverage: string[];
  cashback_rate: number;
  account_types_count: number;
  status: string;
  show_on_cashback: boolean;
  rating: number | null;
}

// Exactly one of category/symbol — a category-level rate, or an exact-symbol
// override. rate is $ per lot, NOT the same units as Broker.cashback_rate
// (a separate headline %). See METAAPI_INTEGRATION_ARCHITECTURE.md §5/§6.
export interface InstrumentCashback {
  category: string | null;
  symbol: string | null;
  rate: number;
}

export interface BrokerAccountType {
  name: string;
  description: string | null;
  cashback: InstrumentCashback[];
  // Specs shown in the account types table — independent of cashback (our
  // rebate); these describe the account's own trading terms at the broker.
  min_deposit: number | null;
  spread_from: string | null;
  commission: string | null;
  swap_free: boolean;
}

export interface PlatformInfo {
  name: string;
  description: string | null;
}

export interface FundingMethod {
  method: string;
  processing_time: string | null;
  fee: string | null;
}

export interface SpreadInfo {
  category: string | null;
  symbol: string | null;
  // Account-type name -> spread value, e.g. { Standard: "1.0 pips", ECN: "0.0 pips" }.
  spreads: Record<string, string>;
  commission: string | null;
}

export interface RegulationEntry {
  regulator: string;
  license_number: string | null;
  active_since: string | null;
}

// One broker's full cashback offer — account types, per-instrument rates,
// terms, payout details, and a UTM-tagged link to actually sign up with
// them. Fetched per-broker on the offer detail page.
export interface PublicBrokerOffer {
  id: string;
  name: string;
  img_src: string | null;
  coverage_type: 'region' | 'country';
  geo_coverage: string[];
  cashback_rate: number;
  account_types: BrokerAccountType[];
  terms_text: string | null;
  payout_destination: 'wallet' | 'trading_account';
  payout_duration_days: number | null;
  referral_url: string | null;
  // 0-10 editorial score — distinct from user_rating_avg below.
  rating: number | null;

  tagline: string | null;
  about: string | null;
  founded_year: number | null;
  headquarters: string | null;
  min_deposit: number | null;
  max_leverage: string | null;
  execution_type: string | null;

  regulations: RegulationEntry[];
  segregated_funds: boolean;
  negative_balance_protection: boolean;
  compensation_scheme: string | null;

  spreads: SpreadInfo[];
  platforms: PlatformInfo[];
  funding_methods: FundingMethod[];
  support_channels: string[];
  support_languages: string[];
  support_hours: string | null;
  pros: string[];
  cons: string[];

  // Aggregate of other users' 1-5 ratings — null/0 when nobody has rated yet.
  user_rating_avg: number | null;
  user_rating_count: number;
}

// One linked MT5 account and its cashback wallet. A user can have several —
// including more than one with the same broker.
export interface MT5Account {
  id: string;
  broker_id: string;
  broker_name: string;
  broker_img_src: string | null;
  mt5_number: string;
  account_type: string | null;
  balance: number;
  lifetime_earned: number;
  // Sum of unsettled, priced trades' expected_amount — the system's own
  // automatic calculation, not yet credited to balance. Shown to the
  // customer as "System Estimate", not "pending" (see Account page's Wallet
  // tab) — an evaluation, not a queued payment.
  pending_expected_amount: number;
  // "not_connected" | "pending" | "deployed" | "connected" | "error"
  metaapi_connection_status: string;
  created_at: string;
}

// One wallet history entry — a credit (money in, e.g. a cashback rebate) or
// a debit (money out, e.g. a withdrawal) against one of the user's MT5
// account wallets.
export interface WalletTransaction {
  id: string;
  mt5_account_id: string;
  broker_name: string;
  mt5_number: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  created_at: string;
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
  // Real MetaApi/CopyFactory master-account link — see
  // METAAPI_INTEGRATION_ARCHITECTURE.md §10 step 6. is_live=false means this
  // trader is still curated stats only, not real copy trading.
  is_live: boolean;
  broker_id: string | null;
  mt5_number: string | null;
  metaapi_connection_status: string;
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
  // Optional per-article SEO overrides — when set, take priority over the
  // generic news_detail/analysis_detail SEO template for this article.
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  og_image?: string | null;
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

export type BrokerSectionKey = "featured";

export interface HomepageData {
  market_prices: Array<{ symbol: string; price: string; change_pct: string; direction: string }>;
  top_traders: Array<{ id: string; name: string; avatar_initials: string; roi_12m: number; followers: number; win_rate: number; strategy: string; pairs: string[] }>;
  latest_news: Array<{ id: string; title: string; excerpt?: string; cover_image_url?: string; created_at: string }>;
  open_plays: Array<{ id: string; pair: string; direction: string; entry_price: string; take_profit?: string; stop_loss?: string; timeframe?: string; play_type: string; status: string }>;
  latest_analysis: Array<{ id: string; title: string; symbol?: string; market_category?: string; created_at: string }>;
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

// What a visitor actually sees — the banner's image (already picked for
// their locale) and where clicking it goes.
export interface AdBannerContent {
  image_url: string | null;
  link_url: string | null;
  alt: string;
  dismissible: boolean;
}

export interface AdBanner {
  id: string;
  page: AdPlacementPage;
  slot: string;
  // Coverage scope this content targets: "default" (fallback), a broker
  // geo_coverage region code (e.g. "europe"), or an ISO country code — same
  // scope semantics as BrokerPlacementRegion.
  region: BrokerPlacementRegion;
  broker_id: string;
  // One creative image per language the broker provided, e.g.
  // { en: "https://...", ar: "https://..." }. Resolved to the visitor's
  // locale on read (AdBannerContent.image_url) — not machine-translated.
  images: Record<string, string>;
  // Shown when the visitor's locale has no entry in `images`.
  default_image_url: string | null;
  // Click-through override; falls back to the broker's own referral link
  // when unset.
  link_url: string | null;
  dismissible: boolean;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface AdBannerUpsert {
  broker_id: string;
  images: Record<string, string>;
  default_image_url: string | null;
  link_url: string | null;
  dismissible: boolean;
  status: "active" | "inactive";
}

// ── Domain APIs ────────────────────────────────────────────────────────────────

export const marketPricesApi = {
  list: () => api.get<MarketPrice[]>('/market-prices'),
};

export interface CopyTraderCreate {
  name: string;
  avatar_initials: string;
  bio?: string;
  roi_12m?: number;
  roi_3m?: number;
  roi_1m?: number;
  followers?: number;
  win_rate?: number;
  drawdown?: number;
  strategy?: 'Scalping' | 'Swing' | 'Position';
  pairs?: string[];
  is_featured?: boolean;
  is_active?: boolean;
}

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
  create: (payload: CopyTraderCreate) => api.post<CopyTrader>('/copy-traders', payload),
  remove: (id: string) => api.delete<void>(`/copy-traders/${id}`),
  connectLive: (
    id: string,
    payload: { broker_id: string; mt5_number: string; server: string; platform: 'mt4' | 'mt5'; investor_password: string },
  ) => api.post<CopyTrader>(`/copy-traders/${id}/connect-live`, payload),
};

// Real copy-trading subscriptions (follower side) — see
// METAAPI_INTEGRATION_ARCHITECTURE.md §10 step 6. Requires an active
// Signals + Copy Trading subscription (billingApi) to create; listing your
// own stays visible even if that lapses.
export interface CopySubscription {
  id: string;
  copy_trader_id: string;
  copy_trader_name: string;
  mt5_account_id: string;
  broker_name: string;
  mt5_number: string;
  multiplier: number;
  // "pending" | "active" | "paused" | "stopped" | "error"
  status: string;
  metaapi_connection_status: string;
  created_at: string;
}

export const copySubscriptionsApi = {
  listMine: () => api.get<CopySubscription[]>('/copy-subscriptions/me'),
  create: (payload: { copy_trader_id: string; mt5_account_id: string; trading_password: string; multiplier: number }) =>
    api.post<CopySubscription>('/copy-subscriptions', payload),
  stop: (id: string) => api.delete<void>(`/copy-subscriptions/${id}`),
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
  // Active brokers whose coverage includes the visitor's IP-detected
  // region/country — used to populate the register page's broker picker.
  brokers: () => api.get<PublicBroker[]>('/public/brokers'),
  // One broker's full offer (account types, per-instrument rates, terms,
  // payout details, referral link) — the /brokers/[id] detail page.
  brokerOffer: (id: string) => api.get<PublicBrokerOffer>(`/public/brokers/${id}`),
};

// A signed-in user's own 1-5 rating of one broker — distinct from the
// broker's editorial `rating` (0-10), which only a super_admin sets.
export interface BrokerRating {
  rating: number;
  updated_at: string;
}

export const brokerRatingApi = {
  mine: (brokerId: string) => api.get<BrokerRating | null>(`/brokers/${brokerId}/rating/me`),
  submit: (brokerId: string, rating: number) =>
    api.post<BrokerRating>(`/brokers/${brokerId}/rating`, { rating }),
};

export const usersApi = {
  me: () => api.get<UserProfile>('/users/me'),
  updateMe: (payload: UserSelfUpdate) => api.patch<UserProfile>('/users/me', payload),
};

// Returned by resendOtp() — the account isn't created yet, only a
// verification code was emailed.
export interface OtpSentResponse {
  message: string;
  email: string;
  expires_in: number; // seconds until the emailed code stops working
}

// Returned by register(). registration_token is a one-time secret for this
// signup attempt, handed back only here (never emailed) — required by
// verifyOtp() and by a later register() call for the same email if it needs
// correcting before verification completes.
export interface RegisterInitiatedResponse extends OtpSentResponse {
  registration_token: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

// Returned by forgotPassword(). "otp" means a code was emailed — proceed to
// resetPassword() using reset_token. "notified" means this account's role
// doesn't get self-service reset (editor/broker/etc.) — a super_admin was
// notified to regenerate its password instead, expires_in/reset_token are
// unused (0 / "").
export interface ForgotPasswordResponse {
  flow: "otp" | "notified";
  message: string;
  email: string;
  expires_in: number;
  reset_token: string;
}

export const authApi = {
  register: (payload: RegisterRequest) => api.post<RegisterInitiatedResponse>('/auth/register', payload),
  verifyOtp: (payload: { email: string; code: string; registration_token: string }) =>
    api.post<AuthToken>('/auth/verify-otp', payload),
  resendOtp: (payload: { email: string }) => api.post<OtpSentResponse>('/auth/resend-otp', payload),
  forgotPassword: (payload: { email: string; captcha_token: string }) =>
    api.post<ForgotPasswordResponse>('/auth/forgot-password', payload),
  resetPassword: (payload: { email: string; code: string; reset_token: string; new_password: string }) =>
    api.post<AuthToken>('/auth/reset-password', payload),
  resendPasswordResetOtp: (payload: { email: string }) =>
    api.post<OtpSentResponse>('/auth/resend-password-reset-otp', payload),
};

// ── Referral clients (admin-managed User accounts with role "client") ──────────

export interface AdminUserCreate {
  email: string;
  name: string;
  password: string;
  role?: string;
  referral_code?: string;
}

export interface AdminUserUpdate {
  name?: string;
  referral_code?: string;
}

export const adminUsersApi = {
  list: (role?: string) => api.get<UserProfile[]>(`/users/${role ? `?role=${encodeURIComponent(role)}` : ''}`),
  create: (payload: AdminUserCreate) => api.post<UserProfile>('/users/', payload),
  update: (email: string, payload: AdminUserUpdate) =>
    api.patch<UserProfile>(`/users/${encodeURIComponent(email)}`, payload),
  delete: (email: string) => api.delete<void>(`/users/${encodeURIComponent(email)}`),
};

// ── Referrals ────────────────────────────────────────────────────────────────

export interface ReferralInfo {
  referral_code: string | null;
}

export interface ReferralBucket {
  label: string;
  count: number;
}

export interface ReferralStats {
  total: number;
  // Referred users with a MetaApi-verified MT5 account at a cashback-eligible
  // broker (subset of total) — see backend/app/utils/active_users.py.
  active: number;
  by_country: Record<string, number>;
  weekly: ReferralBucket[];
  monthly: ReferralBucket[];
}

export interface ClientReferralSummary {
  client_email: string;
  client_name: string | null;
  referral_code: string | null;
  total: number;
  active: number;
  active_accounts: number;
}

export interface AdminReferralStats extends ReferralStats {
  by_client: ClientReferralSummary[];
}

export const referralsApi = {
  me: () => api.get<ReferralInfo>('/referrals/me'),
  myStats: () => api.get<ReferralStats>('/referrals/me/stats'),
  adminStats: () => api.get<AdminReferralStats>('/referrals/admin/stats'),
};

// ── Site visitors ────────────────────────────────────────────────────────────

export interface VisitBucket {
  label: string;
  count: number;
}

export interface VisitStats {
  total: number;
  by_country: Record<string, number>;
  daily: VisitBucket[];
  weekly: VisitBucket[];
  monthly: VisitBucket[];
  yearly: VisitBucket[];
}

export const visitsApi = {
  stats: (country?: string) =>
    api.get<VisitStats>(`/visits/stats${country ? `?country=${encodeURIComponent(country)}` : ''}`),
};

export const mt5AccountsApi = {
  listMine: () => api.get<MT5Account[]>('/mt5-accounts/me'),
  create: (payload: {
    broker_id: string;
    mt5_number: string;
    server: string;
    platform: 'mt4' | 'mt5';
    investor_password: string;
    account_type?: string;
  }) => api.post<MT5Account>('/mt5-accounts/', payload),
  listTransactions: () => api.get<WalletTransaction[]>('/mt5-accounts/me/transactions'),
  activeCount: () => api.get<{ active_users: number }>('/mt5-accounts/active-count'),
  // Only succeeds for a never-connected/failed account with no cashback
  // history or live copy subscription — see backend/app/routers/
  // mt5_accounts.py:remove_my_account for the full eligibility rules.
  remove: (accountId: string) => api.delete<void>(`/mt5-accounts/${accountId}`),
  // Retries MetaApi provisioning/deployment for a not_connected/pending/error
  // account — see mt5_accounts.py:reconnect_my_account.
  reconnect: (accountId: string) => api.post<MT5Account>(`/mt5-accounts/${accountId}/reconnect`, {}),
};

// Admin visibility into every linked MT5 account's MetaApi connection health
// — gap-analysis item 3.2 / METAAPI_INTEGRATION_ARCHITECTURE.md §10 step 5.
export interface AdminMT5Account {
  id: string;
  user_email: string;
  broker_id: string;
  broker_name: string;
  mt5_number: string;
  account_type: string | null;
  metaapi_connection_status: string;
  metaapi_last_synced_at: string | null;
  created_at: string;
}

export const mt5AccountsAdminApi = {
  list: () => api.get<AdminMT5Account[]>('/mt5-accounts/admin'),
};

// Admin-managed symbol -> instrument-category mapping, used by the
// (not-yet-built) rebate calculation step to resolve a traded symbol like
// "XAUUSDm" to a category ("metals") for pricing against
// Broker.account_types[].cashback. See METAAPI_INTEGRATION_ARCHITECTURE.md §5/§11.
export interface SymbolCategory {
  id: string;
  symbol: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export const symbolCategoriesApi = {
  list: () => api.get<SymbolCategory[]>('/symbol-categories'),
  create: (payload: { symbol: string; category: string }) =>
    api.post<SymbolCategory>('/symbol-categories', payload),
  update: (id: string, payload: { category: string }) =>
    api.put<SymbolCategory>(`/symbol-categories/${id}`, payload),
  remove: (id: string) => api.delete(`/symbol-categories/${id}`),
};

// One MT5 account with priced-but-unsettled cashback trades — expected_amount
// is a reference figure only, nothing has been credited yet. See
// METAAPI_INTEGRATION_ARCHITECTURE.md §6 (expected vs. actual, decided 2026-08-29).
export interface PendingRebatePayout {
  mt5_account_id: string;
  user_email: string;
  mt5_number: string;
  broker_name: string;
  expected_amount: number;
  trade_count: number;
}

export interface RebatePayout {
  id: string;
  mt5_account_id: string;
  expected_amount: number;
  actual_amount: number;
  trade_count: number;
  note: string | null;
}

export const rebatePayoutsApi = {
  listPending: () => api.get<PendingRebatePayout[]>('/rebate-payouts/pending'),
  issue: (payload: { mt5_account_id: string; actual_amount: number; note?: string }) =>
    api.post<RebatePayout>('/rebate-payouts', payload),
};

// Combined Signals + Copy Trading subscription paywall (Stripe embedded checkout).
export const billingApi = {
  createCheckout: (payload: { return_url: string }) =>
    api.post<{ client_secret: string }>('/billing/checkout', payload),
};

export interface SeoMetaUpsert {
  title: string;
  description: string;
  keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_card: string;
  canonical_path: string | null;
  robots: string;
}

// The full admin-facing record — includes id/sub_key/timestamps that the
// public-facing SeoMetaData (helpers/seo.ts, used by generateMetadata)
// deliberately omits.
export interface AdminSeoMeta extends SeoMetaUpsert {
  id: string;
  route: string;
  sub_key: string;
  created_at: string;
  updated_at: string;
}

export interface SeoSettingsUpsert {
  google_site_verification: string | null;
  bing_site_verification: string | null;
  pinterest_site_verification: string | null;
  facebook_domain_verification: string | null;
  twitter_site: string | null;
  default_share_title: string | null;
  default_share_description: string | null;
  default_share_image: string | null;
  default_keywords: string | null;
}

export interface AdminSeoSettings extends SeoSettingsUpsert {
  updated_at: string;
}

export const seoApi = {
  list: () => api.get<AdminSeoMeta[]>('/seo/'),
  listRoutes: () => api.get<SeoRoute[]>('/seo/routes'),
  set: (route: SeoRoute, payload: SeoMetaUpsert, subKey?: string) =>
    api.put<AdminSeoMeta>(`/seo/${route}${subKey ? `?sub_key=${encodeURIComponent(subKey)}` : ''}`, payload),
  clear: (route: SeoRoute, subKey: string) =>
    api.delete<void>(`/seo/${route}?sub_key=${encodeURIComponent(subKey)}`),
  getSettings: () => api.get<AdminSeoSettings>('/seo/settings'),
  setSettings: (payload: SeoSettingsUpsert) => api.put<AdminSeoSettings>('/seo/settings', payload),
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

// ── Ad Campaigns ─────────────────────────────────────────────────────────────

// draft: super_admin-authored, not yet launched. pending_review: a broker
// launched it, awaiting a super_admin decision. active: approved and live.
// declined: rejected by a super_admin. paused/completed: post-approval
// lifecycle, admin-managed.
export type CampaignStatus = "draft" | "pending_review" | "active" | "declined" | "paused" | "completed";

export interface Campaign {
  id: string;
  name: string;
  client_id: string | null;
  budget: number;
  impressions: number;
  clicks: number;
  spend: number;
  status: CampaignStatus;
  start_date: string | null;
  end_date: string | null;
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignCreate {
  name: string;
  client_id?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  image_url?: string;
}

export interface CampaignUpdate {
  name?: string;
  client_id?: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  image_url?: string;
}

export interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_budget: number;
  total_impressions: number;
  total_clicks: number;
  total_spend: number;
  ctr: number;
}

export const campaignsApi = {
  // Scoped server-side: super_admin sees every campaign, a broker only
  // sees campaigns they created.
  list: () => api.get<Campaign[]>('/campaigns/'),
  get: (id: string) => api.get<Campaign>(`/campaigns/${id}`),
  stats: () => api.get<CampaignStats>('/campaigns/stats'),
  create: (payload: CampaignCreate) => api.post<Campaign>('/campaigns/', payload),
  update: (id: string, payload: CampaignUpdate) => api.put<Campaign>(`/campaigns/${id}`, payload),
  review: (id: string, decision: "confirm" | "decline") =>
    api.post<Campaign>(`/campaigns/${id}/review`, { decision }),
  delete: (id: string) => api.delete<void>(`/campaigns/${id}`),
};

// ── Notifications ────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  related_type: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface MediaImage {
  key: string;
  url: string;
  size: number;
  last_modified: string;
}

export const mediaApi = {
  list: () => api.get<MediaImage[]>('/media/images'),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload<MediaImage>('/media/images', formData);
  },
  remove: (key: string) => apiFetch<void>(`/media/images/${key.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE' }),
};

export interface BrokerReport {
  id: string;
  broker_id: string;
  broker_name: string;
  filename: string;
  url: string;
  size: number;
  uploaded_by: string | null;
  created_at: string;
}

export const brokerReportsApi = {
  list: (brokerId?: string) =>
    api.get<BrokerReport[]>(`/broker-reports/${brokerId ? `?broker_id=${encodeURIComponent(brokerId)}` : ''}`),
  upload: (brokerId: string, file: File) => {
    const formData = new FormData();
    formData.append('broker_id', brokerId);
    formData.append('file', file);
    return apiUpload<BrokerReport>('/broker-reports/', formData);
  },
  remove: (id: string) => apiFetch<void>(`/broker-reports/${id}`, { method: 'DELETE' }),
};

export const notificationsApi = {
  listMine: (unreadOnly?: boolean) =>
    api.get<NotificationItem[]>(`/notifications/me${unreadOnly ? '?unread_only=true' : ''}`),
  unreadCount: () => api.get<{ count: number }>('/notifications/me/unread-count'),
  markRead: (id: string) => api.patch<NotificationItem>(`/notifications/${id}/read`, {}),
  markAllRead: () => api.patch<{ message: string }>('/notifications/me/read-all', {}),
};
