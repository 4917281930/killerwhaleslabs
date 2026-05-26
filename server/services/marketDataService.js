import { httpError } from '../utils/errors.js';

const cache = new Map();
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
const ETHERSCAN_CHAIN_ID = process.env.ETHERSCAN_CHAIN_ID || '1';

async function fetchJson(url, { ttlMs, cacheKey, errorMessage, headers = {}, shouldCache = () => true }) {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < ttlMs) return cached.data;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json', ...headers }
    });

    if (!response.ok) throw new Error(errorMessage);
    const data = await response.json();
    if (shouldCache(data)) cache.set(cacheKey, { cachedAt: Date.now(), data });
    return data;
  } catch (error) {
    if (cached?.data) return { ...cached.data, stale: true };
    throw httpError(502, errorMessage);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDominance() {
  const json = await fetchJson('https://api.coingecko.com/api/v3/global', {
    ttlMs: 60_000,
    cacheKey: 'dominance',
    errorMessage: 'Market dominance feed is temporarily unavailable'
  });

  const percentages = json?.data?.market_cap_percentage;
  const btcDominance = Number(percentages?.btc);
  const ethDominance = Number(percentages?.eth);

  if (!Number.isFinite(btcDominance) || !Number.isFinite(ethDominance)) {
    throw httpError(502, 'Market dominance payload is invalid');
  }

  return {
    btcDominance,
    ethDominance,
    updatedAt: new Date().toISOString(),
    provider: 'coingecko',
    stale: Boolean(json.stale)
  };
}

export async function fetchFearGreed() {
  const json = await fetchJson('https://api.alternative.me/fng/?limit=1', {
    ttlMs: 300_000,
    cacheKey: 'fear-greed',
    errorMessage: 'Fear and Greed feed is temporarily unavailable'
  });

  const item = json?.data?.[0];
  const value = Number(item?.value);
  if (!Number.isFinite(value) || !item?.value_classification) {
    throw httpError(502, 'Fear and Greed payload is invalid');
  }

  return {
    value,
    label: item.value_classification,
    updatedAt: item.timestamp ? new Date(Number(item.timestamp) * 1000).toISOString() : new Date().toISOString(),
    provider: 'alternative.me',
    stale: Boolean(json.stale)
  };
}

export async function fetchGasOracle() {
  const params = new URLSearchParams({
    chainid: ETHERSCAN_CHAIN_ID,
    module: 'gastracker',
    action: 'gasoracle',
    apikey: ETHERSCAN_API_KEY
  });

  const json = await fetchJson(`https://api.etherscan.io/v2/api?${params.toString()}`, {
    ttlMs: 30_000,
    cacheKey: `gas:${ETHERSCAN_CHAIN_ID}`,
    errorMessage: 'ETH gas feed is temporarily unavailable',
    shouldCache: (data) => data?.status === '1'
  });

  if (json?.status && json.status !== '1') {
    throw httpError(502, json?.result || json?.message || 'ETH gas feed is temporarily unavailable');
  }

  const result = json?.result;
  const slow = Number(result?.SafeGasPrice);
  const standard = Number(result?.ProposeGasPrice);
  const fast = Number(result?.FastGasPrice);

  if (!Number.isFinite(slow) || !Number.isFinite(standard) || !Number.isFinite(fast)) {
    throw httpError(502, 'ETH gas payload is invalid');
  }

  return {
    slow,
    standard,
    fast,
    updatedAt: new Date().toISOString(),
    provider: 'etherscan',
    stale: Boolean(json.stale)
  };
}

export async function fetchTrendingCoins() {
  const json = await fetchJson('https://api.coingecko.com/api/v3/search/trending', {
    ttlMs: 600_000,
    cacheKey: 'trending',
    errorMessage: 'Trending coins feed is temporarily unavailable'
  });

  const coins = Array.isArray(json?.coins) ? json.coins : [];
  return {
    coins: coins.slice(0, 7).map(({ item }, index) => ({
      rank: index + 1,
      id: item?.id,
      name: item?.name || 'Unknown',
      symbol: item?.symbol || '--',
      priceUsd: typeof item?.data?.price === 'number' ? item.data.price : null,
      change24h: typeof item?.data?.price_change_percentage_24h?.usd === 'number' ? item.data.price_change_percentage_24h.usd : null,
      thumb: item?.thumb || null
    })),
    updatedAt: new Date().toISOString(),
    provider: 'coingecko',
    stale: Boolean(json.stale)
  };
}
