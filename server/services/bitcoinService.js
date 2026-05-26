import { httpError } from '../utils/errors.js';

const priceCache = new Map();
const ttlMs = 20_000;

function mapBinanceTicker(json, symbol) {
  return {
    symbol,
    usd: Number(json.lastPrice),
    change24h: Number(json.priceChangePercent),
    volume24h: Number(json.volume),
    quoteVolume24h: Number(json.quoteVolume),
    high24h: Number(json.highPrice),
    low24h: Number(json.lowPrice),
    updatedAt: new Date(Number(json.closeTime) || Date.now()).toISOString(),
    provider: 'binance'
  };
}

function mapCoinGeckoPrice(json, id, symbol) {
  const coin = json[id];
  if (!coin || typeof coin.usd !== 'number') throw new Error('Invalid CoinGecko payload');
  return {
    symbol,
    usd: coin.usd,
    change24h: coin.usd_24h_change ?? null,
    volume24h: null,
    quoteVolume24h: null,
    high24h: null,
    low24h: null,
    updatedAt: coin.last_updated_at ? new Date(coin.last_updated_at * 1000).toISOString() : new Date().toISOString(),
    provider: 'coingecko fallback'
  };
}

async function fetchMarketPrice({ symbol, binanceSymbol, coinGeckoId }) {
  const cache = priceCache.get(symbol);
  if (cache && Date.now() - cache.cachedAt < ttlMs) return cache.data;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    let response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' }
    });

    let data;
    if (response.ok) {
      const json = await response.json();
      data = mapBinanceTicker(json, symbol);
    } else {
      response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`,
        { signal: controller.signal, headers: { accept: 'application/json' } }
      );
      if (!response.ok) throw new Error(`Market providers unavailable`);
      data = mapCoinGeckoPrice(await response.json(), coinGeckoId, symbol);
    }

    if (!Number.isFinite(data.usd)) throw new Error('Invalid price payload');

    priceCache.set(symbol, { cachedAt: Date.now(), data });
    return data;
  } catch (error) {
    if (cache?.data) return { ...cache.data, stale: true };
    throw httpError(502, `${symbol} price feed is temporarily unavailable`);
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchBitcoinPrice() {
  return fetchMarketPrice({ symbol: 'BTC', binanceSymbol: 'BTCUSDT', coinGeckoId: 'bitcoin' });
}

export function fetchEthereumPrice() {
  return fetchMarketPrice({ symbol: 'ETH', binanceSymbol: 'ETHUSDT', coinGeckoId: 'ethereum' });
}
