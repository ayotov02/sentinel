const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('sentinel_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Auth
export const login = (email: string, password: string) =>
  request<{ token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const register = (email: string, password: string, displayName: string) =>
  request<{ token: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) });

export const getMe = () => request<any>('/auth/me');

// Entities
export const getEntities = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<any[]>(`/entities${qs}`);
};

export const getEntity = (id: string) => request<any>(`/entities/${id}`);

export const searchEntities = (q: string) => request<any[]>(`/entities/search?q=${encodeURIComponent(q)}`);

// Timeseries
export const getTrajectory = (entityId: string, start: string, end: string) =>
  request<any>(`/timeseries/trajectory/${entityId}?start=${start}&end=${end}`);

export const getProximity = (lat: number, lon: number, radius: number) =>
  request<any[]>(`/timeseries/proximity?lat=${lat}&lon=${lon}&radius=${radius}`);

export const getLatestPositions = (entityType?: string) => {
  const qs = entityType ? `?entityType=${entityType}` : '';
  return request<any[]>(`/timeseries/latest${qs}`);
};

export const getHourlySummary = (entityId: string, start: string, end: string) =>
  request<any[]>(`/timeseries/summary/${entityId}?start=${start}&end=${end}`);

// Graph
export const getGraphNeighbors = (entityId: string, depth = 1) =>
  request<any>(`/graph/neighbors/${entityId}?depth=${depth}`);

export const getShortestPath = (source: string, target: string) =>
  request<any>(`/graph/shortest-path?source=${source}&target=${target}`);

export const getPageRank = () => request<any[]>('/graph/pagerank');

export const getCommunities = () => request<any[]>('/graph/communities');

export const getSubgraph = (entityIds: string[]) =>
  request<any>('/graph/subgraph', { method: 'POST', body: JSON.stringify({ entityIds }) });

// Cases
export const getCases = () => request<any[]>('/cases');
export const getCase = (id: string) => request<any>(`/cases/${id}`);
export const createCase = (data: any) => request<any>('/cases', { method: 'POST', body: JSON.stringify(data) });
export const updateCase = (id: string, data: any) => request<any>(`/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const getCaseActivities = (id: string) => request<any[]>(`/cases/${id}/activities`);
export const addCaseEntity = (caseId: string, entityId: string) =>
  request<any>(`/cases/${caseId}/entities`, { method: 'POST', body: JSON.stringify({ entityId }) });

// Alerts
export const getAlerts = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return request<any[]>(`/alerts${qs}`);
};
export const acknowledgeAlert = (id: string) => request<any>(`/alerts/${id}/acknowledge`, { method: 'POST' });
export const escalateAlert = (id: string) => request<any>(`/alerts/${id}/escalate`, { method: 'POST' });
export const dismissAlert = (id: string, note: string) =>
  request<any>(`/alerts/${id}/dismiss`, { method: 'POST', body: JSON.stringify({ note }) });
export const getAlertRules = () => request<any[]>('/alerts/rules/all');
export const createAlertRule = (data: any) => request<any>('/alerts/rules', { method: 'POST', body: JSON.stringify(data) });

// Search
export const globalSearch = (q: string, params?: Record<string, string>) => {
  const qs = new URLSearchParams({ q, ...params }).toString();
  return request<any[]>(`/search?${qs}`);
};
export const autocomplete = (q: string) => request<any[]>(`/search/autocomplete?q=${encodeURIComponent(q)}`);

// Ingestion
export const getIngestionJobs = () => request<any[]>('/ingestion/jobs');
export const getIngestionJob = (id: string) => request<any>(`/ingestion/jobs/${id}`);
export const createIngestionJob = (data: any) => request<any>('/ingestion/upload', { method: 'POST', body: JSON.stringify(data) });
export const confirmIngestion = (id: string, entities: any[]) =>
  request<any>(`/ingestion/jobs/${id}/confirm`, { method: 'POST', body: JSON.stringify({ entities }) });

// AI
export async function* chatStream(messages: any[], systemPrompt?: string): AsyncGenerator<string> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages, systemPrompt }),
  });

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;

  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) yield parsed.content;
        } catch {}
      }
    }
  }
}

export const extractEntities = (text: string) =>
  request<any>('/ai/extract', { method: 'POST', body: JSON.stringify({ text }) });

export const generateBriefing = (entityIds: string[], timeRange: any, context?: string) =>
  request<any>('/ai/briefing', { method: 'POST', body: JSON.stringify({ entityIds, timeRange, context }) });

// Collaboration
export const getCollaborationToken = (docId: string) => request<any>(`/collaboration/token/${docId}`);

// Sanctions
export const screenEntity = (entityId: string) =>
  request<any>(`/sanctions/screen/${entityId}`, { method: 'POST' });

export const searchSanctions = (q: string) =>
  request<any[]>(`/sanctions/search?q=${encodeURIComponent(q)}`);

export const importOFAC = () =>
  request<any>('/sanctions/import/ofac', { method: 'POST' });

export const getSanctionsStats = () =>
  request<any>('/sanctions/stats');

// Embeddings
export const semanticSearch = (query: string, limit = 20) =>
  request<any[]>(`/embeddings/search?q=${encodeURIComponent(query)}&limit=${limit}`);

// OSINT Health
export const getSourceHealth = () =>
  request<any[]>('/osint/health');
