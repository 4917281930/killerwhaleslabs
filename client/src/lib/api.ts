import {
  Project,
  BitcoinMarketData,
  EthereumMarketData,
  FearGreedData,
  GasData,
  TrendingCoin,
  AdminSession,
  ApiResponse
} from './types.ts';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const jsonHeaders = { 'Content-Type': 'application/json' };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = { ...jsonHeaders, ...(options.headers || {}) } as Record<string, string>;

  const cookies = Object.fromEntries(
    document.cookie
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );

  if (cookies.kwl_csrf) {
    headers['X-CSRF-Token'] = cookies.kwl_csrf;
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || data?.success === false) {
    throw new ApiError(data?.error?.message || 'Request failed', response.status);
  }

  if (!data) {
    throw new ApiError('Empty response payload', response.status);
  }

  return data.data;
}

export function getProjects(): Promise<Project[]> {
  return request<Project[]>('/api/projects');
}

export function getProjectBySlug(slug: string): Promise<Project> {
  return request<Project>(`/api/projects/${slug}`);
}

export function createProject(payload: Partial<Project>): Promise<Project> {
  return request<Project>('/api/admin/projects', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateProject(id: number, payload: Partial<Project>): Promise<Project> {
  return request<Project>(`/api/admin/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteProject(id: number): Promise<{ id: number }> {
  return request<{ id: number }>(`/api/admin/projects/${id}`, { method: 'DELETE' });
}

export function uploadProjectLogo(imageData: string, projectName: string): Promise<{ logoUrl: string }> {
  return request<{ logoUrl: string }>('/api/admin/uploads/logo', {
    method: 'POST',
    body: JSON.stringify({ imageData, projectName })
  });
}

export function getBitcoinPrice(): Promise<BitcoinMarketData> {
  return request<BitcoinMarketData>('/api/market/btc');
}

export function getEthereumPrice(): Promise<EthereumMarketData> {
  return request<EthereumMarketData>('/api/market/eth');
}

export interface DominanceResponse {
  btcDominance: number;
  ethDominance: number;
}

export function getDominance(): Promise<DominanceResponse> {
  return request<DominanceResponse>('/api/market/dominance');
}

export function getFearGreed(): Promise<FearGreedData> {
  return request<FearGreedData>('/api/market/fear-greed');
}

export function getGasOracle(): Promise<GasData> {
  return request<GasData>('/api/market/gas');
}

export interface TrendingCoinsResponse {
  coins: TrendingCoin[];
  updatedAt: string;
}

export function getTrendingCoins(): Promise<TrendingCoinsResponse> {
  return request<TrendingCoinsResponse>('/api/market/trending');
}

export function loginAdmin(payload: Record<string, string>): Promise<AdminSession> {
  return request<AdminSession>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function logoutAdmin(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/admin/logout', { method: 'POST' });
}

export function getAdminMe(): Promise<AdminSession> {
  return request<AdminSession>('/api/admin/me');
}
