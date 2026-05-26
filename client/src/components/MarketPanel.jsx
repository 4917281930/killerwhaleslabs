import { Activity, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getBitcoinPrice, getEthereumPrice } from '../lib/api.js';
import { formatCompactUsd, formatPercent, formatUsd } from '../lib/format.js';
import { LoadingSpinner } from './LoadingSpinner.jsx';

const markets = {
  BTC: {
    symbol: 'BTC',
    pairLabel: 'BTC/USD',
    unit: 'BTC',
    wsUrl: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
    fetchSnapshot: getBitcoinPrice
  },
  ETH: {
    symbol: 'ETH',
    pairLabel: 'ETH/USD',
    unit: 'ETH',
    wsUrl: 'wss://stream.binance.com:9443/ws/ethusdt@trade',
    fetchSnapshot: getEthereumPrice
  }
};

const initialMarket = {
  usd: null,
  change24h: null,
  volume24h: null,
  quoteVolume24h: null,
  updatedAt: null,
  provider: 'binance'
};

function useDelayedLoading(loading) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setShow(true), 300);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return show;
}

function useLiveMarket(config) {
  const [market, setMarket] = useState(initialMarket);
  const [direction, setDirection] = useState('flat');
  const [mode, setMode] = useState('connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastPrice = useRef(null);
  const latestTrade = useRef(null);
  const frame = useRef(null);
  const resetTimer = useRef(null);

  const loadSnapshot = useCallback(async () => {
    if (!lastPrice.current) setLoading(true);

    try {
      const data = await config.fetchSnapshot();
      setMarket((current) => ({ ...current, ...data }));
      lastPrice.current = data.usd;
      setError('');
      setMode((current) => (current === 'live' ? current : 'polling'));
    } catch (err) {
      setError(err.message || 'Market feed unavailable');
      setMode('offline');
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    let socket;
    let closed = false;
    let poll;

    function flushTrade() {
      frame.current = null;
      const trade = latestTrade.current;
      if (!trade) return;

      const nextPrice = Number(trade.p);
      const previous = lastPrice.current;
      lastPrice.current = nextPrice;
      setDirection(previous === null || nextPrice === previous ? 'flat' : nextPrice > previous ? 'up' : 'down');
      setLoading(false);
      setMarket((current) => ({
        ...current,
        usd: nextPrice,
        updatedAt: new Date(Number(trade.T) || Date.now()).toISOString(),
        provider: 'binance ws'
      }));
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setDirection('flat'), 420);
    }

    function startPolling() {
      loadSnapshot();
      poll = window.setInterval(loadSnapshot, 10000);
    }

    try {
      socket = new WebSocket(config.wsUrl);
      socket.onopen = () => {
        if (!closed) {
          setMode('live');
          setError('');
        }
      };
      socket.onmessage = (event) => {
        latestTrade.current = JSON.parse(event.data);
        if (!frame.current) frame.current = window.setTimeout(flushTrade, 220);
      };
      socket.onerror = () => {
        if (!closed) {
          setError('Fallback active');
          setMode('polling');
          startPolling();
        }
      };
      socket.onclose = () => {
        if (!closed) {
          setMode('polling');
          startPolling();
        }
      };
    } catch {
      setMode('polling');
      startPolling();
    }

    return () => {
      closed = true;
      if (socket) socket.close();
      if (poll) window.clearInterval(poll);
      if (frame.current) window.clearTimeout(frame.current);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, [config, loadSnapshot]);

  return { market, direction, mode, loading, error, reload: loadSnapshot };
}

export function MarketPanel({ asset = 'BTC' }) {
  const config = markets[asset] || markets.BTC;
  const { market, direction, mode, loading, error, reload } = useLiveMarket(config);
  const showSpinner = useDelayedLoading(loading && !market.usd);
  const positive = typeof market.change24h === 'number' && market.change24h >= 0;
  const flashClass =
    direction === 'up'
      ? 'text-emerald-300 [text-shadow:0_0_22px_rgba(52,211,153,0.16)]'
      : direction === 'down'
        ? 'text-red-300 [text-shadow:0_0_22px_rgba(248,113,113,0.14)]'
        : 'text-white';

  return (
    <section id={config.symbol === 'BTC' ? 'market' : undefined} className="min-w-0 rounded-lg border border-white/[0.09] bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.032))] p-3 shadow-card backdrop-blur sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.16em] text-zinc-400 sm:text-xs sm:tracking-[0.2em]">
            <span className={`h-1.5 w-1.5 rounded-full ${mode === 'live' ? 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)]' : 'bg-bitcoin'}`} />
            <span className="truncate">{mode === 'live' ? `Live ${config.pairLabel}` : config.pairLabel}</span>
          </div>
          <div className={`mt-3 flex min-h-8 min-w-0 items-center truncate font-mono text-[1.35rem] font-semibold tracking-tight transition-colors duration-200 min-[420px]:text-2xl sm:min-h-12 sm:text-4xl lg:text-5xl ${flashClass}`}>
            {market.usd ? formatUsd(market.usd) : showSpinner ? <LoadingSpinner size="sm" /> : '--'}
          </div>
        </div>
        <button
          onClick={reload}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-200 transition hover:border-bitcoin/40 hover:bg-bitcoin/10 hover:text-white"
          aria-label={`Sync ${config.symbol} market data`}
          title="Sync"
        >
          <Activity size={15} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
        <CompactStat label="24h" value={formatPercent(market.change24h)} tone={positive ? 'up' : 'down'} icon={positive ? ArrowUpRight : ArrowDownRight} />
        <CompactStat label="Volume" value={formatCompactUsd(market.quoteVolume24h)} />
        <CompactStat label="Source" value={error || market.provider || 'binance'} />
      </div>
    </section>
  );
}

function CompactStat({ label, value, tone = 'neutral', icon: Icon }) {
  const toneClass = tone === 'up' ? 'text-emerald-300' : tone === 'down' ? 'text-red-300' : 'text-zinc-100';

  return (
    <div className="min-h-14 min-w-0 rounded border border-white/[0.07] bg-black/18 p-2">
      <p className="truncate text-[9px] font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className={`mt-1 flex min-w-0 items-center gap-0.5 truncate text-[11px] font-semibold sm:text-xs ${toneClass}`}>
        {Icon ? <Icon size={12} className="shrink-0" /> : null}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}
