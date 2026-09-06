import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | undefined | null>;

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Query } = {},
): Promise<T> {
  // RN 의 URL/URLSearchParams 폴리필이 불완전하므로 쿼리스트링을 직접 만든다.
  let url = API_BASE_URL + path;
  if (options.query) {
    const parts = Object.entries(options.query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    if (parts.length) url += `?${parts.join('&')}`;
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `요청 실패 (${res.status})`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }
  return data as T;
}

// --- 타입 (백엔드 응답 최소 형태) ---

export type Priority = 'IMMEDIATE' | 'TODAY' | 'THIS_WEEK' | 'NORMAL';

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; name: string };
}

export interface Recommendation {
  score: number;
  priority: Priority;
  reason: string;
  recommendation: string;
  recommendedChannel?: string | null;
}

export interface CustomerTag {
  id: string;
  tag: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  customerNo?: string | null;
  birthDate?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  occupation?: string | null;
  address?: string | null;
  notes?: string | null;
  grade: string;
  interests: string[];
  consultStatus: string;
  lastContactAt: string | null;
  nextContactAt: string | null;
  tags: CustomerTag[];
  recommendation?: Recommendation | null;
}

export interface Consultation {
  id: string;
  consultationDate: string;
  content: string;
  summary?: string | null;
  nextAction?: string | null;
  nextContactDate?: string | null;
}

export interface GeneratedMessage {
  id: string;
  purpose: string;
  tone: string;
  content: string;
  createdAt: string;
}

export interface ConsultationSummary {
  summary: string;
  keyPoints: string[];
  nextAction?: string | null;
  nextContactDate?: string | null;
}

export interface DocumentSummary {
  docType: string;
  summary: string;
  coverages: { name: string; detail: string }[];
  keyDates: string[];
  notes: string[];
}

export interface Proposal {
  sections: { heading: string; body: string }[];
  savedId: string;
}

export interface CustomerDetail extends Customer {
  consultations: Consultation[];
  schedules: Schedule[];
  messages: GeneratedMessage[];
}

export interface CustomerListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: Customer[];
}

export interface CardDraft {
  name?: string;
  phone?: string;
  occupation?: string;
  address?: string;
  notes?: string;
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  birthDate?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  notes?: string;
  grade?: string;
  interests?: string[];
  tags?: string[];
}

export interface DashboardCareItem {
  customerId: string;
  name: string;
  score: number;
  priority: Priority;
  reason: string;
  recommendation: string;
  recommendedChannel?: string | null;
  interests: string[];
  lastContactAt: string | null;
}

export interface Dashboard {
  counts: Record<Priority, number>;
  needsCareToday: DashboardCareItem[];
}

export interface Schedule {
  id: string;
  title: string;
  scheduleDate: string;
  type: string;
  status: string;
  customer?: { id: string; name: string; phone: string } | null;
}

export interface TagSummary {
  tag: string;
  count: number;
}

export interface NewsIndex {
  label: string;
  unit?: string;
  value: string;
}
export interface NewsItem {
  title: string;
  body?: string;
}
export interface NewsSection {
  title: string;
  items: NewsItem[];
}
export interface DailyNews {
  date: string;
  quote?: { text: string; author?: string } | null;
  indices: NewsIndex[];
  sections: NewsSection[];
}

export type AiRecommendationFrequency = 'DAILY' | 'WEEKLY' | 'OFF';

export interface UserPreferences {
  dailyDigestEnabled: boolean;
  notifyConsultation: boolean;
  notifyBirthday: boolean;
  notifyAiRecommendation: boolean;
  aiMessageTone: string;
  aiRecommendationFrequency: AiRecommendationFrequency;
}

export interface WeeklyReport {
  periodStart: string;
  stats: {
    total: number;
    newCustomers: number;
    consulted: number;
    longUnmanaged: number;
  };
  analysis: string;
}

// --- 엔드포인트 ---

export const api = {
  register: (body: {
    name: string;
    email: string;
    password: string;
    occupation?: string;
  }) => request<AuthResult>('/auth/register', { method: 'POST', body }),

  login: (body: { email: string; password: string }) =>
    request<AuthResult>('/auth/login', { method: 'POST', body }),

  oauthGoogle: (idToken: string) =>
    request<AuthResult>('/auth/oauth/google', { method: 'POST', body: { idToken } }),

  oauthApple: (identityToken: string, fullName?: string) =>
    request<AuthResult>('/auth/oauth/apple', {
      method: 'POST',
      body: { identityToken, fullName },
    }),

  me: () => request<{ userId: string; email: string }>('/auth/me'),

  registerDevice: (body: { token: string; platform: 'IOS' | 'ANDROID' | 'WEB' }) =>
    request<{ id: string; token: string }>('/devices', { method: 'POST', body }),

  unregisterDevice: (token: string) =>
    request<{ deleted: boolean }>(`/devices/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    }),

  runDailyDigest: () =>
    request<{ body: string; careCount: number; upcoming: number; deviceCount: number }>(
      '/notifications/daily-digest/run',
      { method: 'POST' },
    ),

  preferences: () => request<UserPreferences>('/me/preferences'),

  updatePreferences: (patch: Partial<UserPreferences>) =>
    request<UserPreferences>('/me/preferences', { method: 'PATCH', body: patch }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ changed: boolean }>('/me/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword },
    }),

  applyLink: () => request<{ token: string }>('/me/apply-link'),
  rotateApplyLink: () =>
    request<{ token: string }>('/me/apply-link/rotate', { method: 'POST' }),

  // 공개 (인증 불필요) - 상담 신청 폼
  applyInfo: (token: string) =>
    request<{ agentName: string }>(`/public/apply/${encodeURIComponent(token)}`),
  submitApply: (
    token: string,
    body: { name: string; phone: string; interest?: string; message?: string },
  ) =>
    request<{ ok: boolean }>(`/public/apply/${encodeURIComponent(token)}`, {
      method: 'POST',
      body,
    }),

  deleteAccount: () => request<{ deleted: boolean }>('/me', { method: 'DELETE' }),

  tags: () => request<TagSummary[]>('/tags'),

  renameTag: (tag: string, newTag: string) =>
    request<{ renamed: number; merged?: number }>(`/tags/${encodeURIComponent(tag)}`, {
      method: 'PATCH',
      body: { newTag },
    }),

  deleteTag: (tag: string) =>
    request<{ deleted: number }>(`/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' }),

  dashboard: () => request<Dashboard>('/ai/dashboard'),

  news: () => request<DailyNews>('/news/today'),

  refreshNews: () =>
    request<{ generated: boolean; date?: string; sections?: number; reason?: string }>(
      '/news/refresh',
      { method: 'POST' },
    ),

  weeklyReport: () => request<WeeklyReport>('/ai/report/weekly'),

  recompute: () => request<{ updated: number }>('/ai/recompute', { method: 'POST' }),

  customers: (query?: {
    q?: string;
    filter?: string;
    tag?: string;
    sort?: string;
    page?: number;
  }) => request<CustomerListResponse>('/customers', { query }),

  customer: (id: string) => request<CustomerDetail>(`/customers/${id}`),

  createCustomer: (body: CreateCustomerInput) =>
    request<Customer>('/customers', { method: 'POST', body }),

  customerFromCard: (image: string, mimeType: string) =>
    request<CardDraft>('/customers/from-card', {
      method: 'POST',
      body: { image, mimeType },
    }),

  updateCustomer: (id: string, body: Partial<CreateCustomerInput>) =>
    request<Customer>(`/customers/${id}`, { method: 'PATCH', body }),

  nextActions: (customerId: string) =>
    request<string[]>(`/ai/customers/${customerId}/next-actions`),

  consultations: (customerId: string) =>
    request<Consultation[]>(`/customers/${customerId}/consultations`),

  createConsultation: (
    customerId: string,
    body: { content: string; consultationDate?: string; autoSummarize?: boolean },
  ) =>
    request<Consultation>(`/customers/${customerId}/consultations`, {
      method: 'POST',
      body,
    }),

  updateConsultation: (
    customerId: string,
    id: string,
    body: {
      content?: string;
      consultationDate?: string;
      nextAction?: string;
      autoSummarize?: boolean;
    },
  ) =>
    request<Consultation>(`/customers/${customerId}/consultations/${id}`, {
      method: 'PATCH',
      body,
    }),

  deleteConsultation: (customerId: string, id: string) =>
    request<{ deleted: boolean }>(`/customers/${customerId}/consultations/${id}`, {
      method: 'DELETE',
    }),

  summarize: (content: string) =>
    request<ConsultationSummary>('/ai/summarize', { method: 'POST', body: { content } }),

  summarizeDocument: (file: string, mimeType: string) =>
    request<DocumentSummary>('/ai/summarize-document', {
      method: 'POST',
      body: { file, mimeType },
    }),

  analyze: (customerId: string) =>
    request<Recommendation>(`/ai/customers/${customerId}/analyze`, { method: 'POST' }),

  generateMessage: (
    customerId: string,
    body: { purpose: string; tone?: string; context?: string },
  ) =>
    request<GeneratedMessage>(`/ai/customers/${customerId}/message`, {
      method: 'POST',
      body,
    }),

  generateProposal: (customerId: string, focus?: string) =>
    request<Proposal>(`/ai/customers/${customerId}/proposal`, {
      method: 'POST',
      body: { focus },
    }),

  schedulesToday: () => request<Schedule[]>('/schedules/today'),

  schedules: (query?: { from?: string; to?: string }) =>
    request<Schedule[]>('/schedules', { query }),

  createSchedule: (body: {
    title: string;
    scheduleDate: string;
    type?: string;
    customerId?: string;
    memo?: string;
  }) => request<Schedule>('/schedules', { method: 'POST', body }),

  updateSchedule: (
    id: string,
    body: { title?: string; scheduleDate?: string; type?: string; status?: string; memo?: string },
  ) => request<Schedule>(`/schedules/${id}`, { method: 'PATCH', body }),

  deleteSchedule: (id: string) =>
    request<{ deleted: boolean }>(`/schedules/${id}`, { method: 'DELETE' }),
};

export const SCHEDULE_TYPES = [
  { key: 'CONTACT', label: '고객 연락' },
  { key: 'PHONE_CONSULT', label: '전화상담' },
  { key: 'VISIT_CONSULT', label: '대면상담' },
  { key: 'CONTRACT', label: '계약' },
  { key: 'RENEWAL', label: '갱신' },
  { key: 'ANNIVERSARY', label: '기념일' },
  { key: 'ETC', label: '기타' },
] as const;

export const PRIORITY_LABEL: Record<Priority, string> = {
  IMMEDIATE: '🔴 즉시',
  TODAY: '🟠 오늘',
  THIS_WEEK: '🟡 이번 주',
  NORMAL: '🟢 정상',
};
