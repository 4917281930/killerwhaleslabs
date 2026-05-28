export interface Project {
  id: number;
  name: string;
  slug: string;
  bio: string;
  category: string;
  status: 'active' | 'watching' | 'paused';
  logoUrl?: string | null;
  logoSourceUrl?: string | null;
  logoCropMode?: 'cover' | 'fit';
  logoCropX?: number;
  logoCropY?: number;
  logoCropZoom?: number;
  websiteUrl?: string | null;
  shortDescription?: string;
  ecosystem?: string;
  chain?: string;
  taskType?: string;
  difficulty?: string;
  riskLevel?: string;
  priority?: number;
  featured?: boolean;
  published?: boolean;
  archived?: boolean;
  officialXUrl?: string | null;
  discordUrl?: string | null;
  telegramUrl?: string | null;
  docsUrl?: string | null;
  appUrl?: string | null;
  notes?: string;
  adminNotes?: string;
  lastCheckedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketTicker {
  usd: number | null;
  change24h: number | null;
  volume24h: number | null;
  quoteVolume24h: number | null;
  updatedAt: string | null;
  provider: string;
}

export interface BitcoinMarketData extends MarketTicker {}
export interface EthereumMarketData extends MarketTicker {}

export interface GasData {
  slow: number;
  standard: number;
  fast: number;
  updatedAt: string;
}

export interface FearGreedData {
  value: number;
  label: string;
}

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  marketCapRank?: number;
  thumb?: string;
  priceUsd: number;
  change24h: number;
  volumeUsd: number;
}

export interface AdminSession {
  username: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
  };
}
