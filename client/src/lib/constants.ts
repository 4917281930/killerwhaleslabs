export const MARKETS = {
  BTC: {
    symbol: 'BTC',
    pairLabel: 'BTC/USD',
    unit: 'BTC',
    wsUrl: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
  },
  ETH: {
    symbol: 'ETH',
    pairLabel: 'ETH/USD',
    unit: 'ETH',
    wsUrl: 'wss://stream.binance.com:9443/ws/ethusdt@trade',
  }
} as const;

export const INITIAL_MARKET = {
  usd: null,
  change24h: null,
  volume24h: null,
  quoteVolume24h: null,
  updatedAt: null,
  provider: 'binance'
};
