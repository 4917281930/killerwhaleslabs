import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { getBitcoinPrice, getEthereumPrice } from '../../lib/api.ts';
import { formatCompactUsd, formatPercent, formatUsd } from '../../lib/format.ts';
import { LoadingSpinner } from '../ui/LoadingSpinner.tsx';
import { BitcoinMarketData, EthereumMarketData } from '../../lib/types.ts';
import { MARKETS, INITIAL_MARKET } from '../../lib/constants.ts';

interface BitcoinPriceCardProps {
  asset?: 'BTC' | 'ETH';
  snapshot?: BitcoinMarketData | EthereumMarketData | null;
}

function useDelayedLoading(loading: boolean): boolean {
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

function readCachedMarket(symbol: string): BitcoinMarketData {
  try {
    const cached = JSON.parse(sessionStorage.getItem(`kwl.market.${symbol}`) || 'null');
    return cached && typeof cached === 'object' ? { ...INITIAL_MARKET, ...cached } : INITIAL_MARKET;
  } catch {
    return INITIAL_MARKET as any;
  }
}

function writeCachedMarket(symbol: string, data: BitcoinMarketData): void {
  try {
    sessionStorage.setItem(`kwl.market.${symbol}`, JSON.stringify(data));
  } catch {
    // Ignore storage failures.
  }
}

function useLiveMarket(config: (typeof MARKETS.BTC | typeof MARKETS.ETH) & { fetchSnapshot: () => Promise<any> }, snapshot: any) {
  const [market, setMarket] = useState<BitcoinMarketData>(() => readCachedMarket(config.symbol));
  const [direction, setDirection] = useState<'flat' | 'up' | 'down'>('flat');
  const [mode, setMode] = useState<'connecting' | 'live' | 'polling' | 'offline'>('connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastPrice = useRef<number | null>(null);
  const latestTrade = useRef<any>(null);
  const frame = useRef<number | null>(null);
  const resetTimer = useRef<number | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const applySnapshot = useCallback((data: any) => {
    setMarket((current) => {
      const next = { ...current, ...data };
      writeCachedMarket(config.symbol, next);
      return next;
    });
    lastPrice.current = data.usd;
    setError('');
    setLoading(false);
  }, [config.symbol]);

  const loadSnapshot = useCallback(async () => {
    const streamedSnapshot = snapshotRef.current;
    if (streamedSnapshot) {
      applySnapshot(streamedSnapshot);
      setMode((current) => (current === 'live' ? current : 'polling'));
      return;
    }

    if (!lastPrice.current) setLoading(true);

    try {
      const data = await config.fetchSnapshot();
      applySnapshot(data);
      setMode((current) => (current === 'live' ? current : 'polling'));
    } catch (err: any) {
      setError(err.message || 'Market feed unavailable');
      setMode('offline');
    } finally {
      setLoading(false);
    }
  }, [applySnapshot, config]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (snapshot) applySnapshot(snapshot);
  }, [applySnapshot, snapshot]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closed = false;
    let poll: number | null = null;

    function isHidden() {
      return typeof document !== 'undefined' && document.hidden;
    }

    function clearPolling() {
      if (poll) {
        window.clearInterval(poll);
        poll = null;
      }
    }

    function closeSocket() {
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
        socket = null;
      }
    }

    function flushTrade() {
      frame.current = null;
      const trade = latestTrade.current;
      if (!trade) return;

      const nextPrice = Number(trade.p);
      const previous = lastPrice.current;
      lastPrice.current = nextPrice;
      setDirection(previous === null || nextPrice === previous ? 'flat' : nextPrice > previous ? 'up' : 'down');
      setLoading(false);
      setMarket((current) => {
        const next: BitcoinMarketData = {
          ...current,
          usd: nextPrice,
          updatedAt: new Date(Number(trade.T) || Date.now()).toISOString(),
          provider: 'binance ws'
        };
        writeCachedMarket(config.symbol, next);
        return next;
      });
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setDirection('flat'), 420);
    }

    function startPolling({ refresh = true } = {}) {
      if (closed || isHidden() || poll) return;
      if (refresh) loadSnapshot();
      poll = window.setInterval(() => {
        if (!isHidden()) loadSnapshot();
      }, 10000);
    }

    function connectSocket({ refreshOnFallback = true } = {}) {
      if (closed || isHidden() || !navigator.onLine) return;

      try {
        socket = new WebSocket(config.wsUrl);
        socket.onopen = () => {
          if (!closed && !isHidden()) {
            clearPolling();
            setMode('live');
            setError('');
          }
        };
        socket.onmessage = (event) => {
          if (isHidden()) return;
          latestTrade.current = JSON.parse(event.data);
          if (!frame.current) frame.current = window.setTimeout(flushTrade, 220);
        };
        socket.onerror = () => {
          if (!closed && !isHidden()) {
            setError('Fallback active');
            setMode('polling');
            startPolling({ refresh: refreshOnFallback });
          }
        };
        socket.onclose = () => {
          socket = null;
          if (!closed && !isHidden()) {
            setMode('polling');
            startPolling({ refresh: refreshOnFallback });
          }
        };
      } catch {
        if (!closed && !isHidden()) {
          setMode('polling');
          startPolling({ refresh: refreshOnFallback });
        }
      }
    }

    function handleVisibilityChange() {
      if (isHidden()) {
        clearPolling();
        closeSocket();
        return;
      }

      connectSocket({ refreshOnFallback: false });
    }

    function handleNetworkChange() {
      if (navigator.onLine) {
        connectSocket({ refreshOnFallback: true });
      } else {
        clearPolling();
        closeSocket();
        setMode('offline');
      }
    }

    connectSocket();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      closed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
      closeSocket();
      clearPolling();
      if (frame.current) window.clearTimeout(frame.current);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    };
  }, [config, loadSnapshot]);

  return { market, direction, mode, loading, error, reload: loadSnapshot };
}

export function BitcoinPriceCard({ asset = 'BTC', snapshot = null }: BitcoinPriceCardProps) {
  const isBtc = asset === 'BTC';
  const config = isBtc
    ? { ...MARKETS.BTC, fetchSnapshot: getBitcoinPrice }
    : { ...MARKETS.ETH, fetchSnapshot: getEthereumPrice };

  const { market, direction, mode, loading, error, reload } = useLiveMarket(config, snapshot);
  const showSpinner = useDelayedLoading(loading && !market.usd);
  const positive = typeof market.change24h === 'number' && market.change24h >= 0;
  
  const flashClass =
    direction === 'up'
      ? 'text-emerald-400 [text-shadow:0_0_22px_rgba(52,211,153,0.25)]'
      : direction === 'down'
        ? 'text-red-400 [text-shadow:0_0_22px_rgba(248,113,113,0.25)]'
        : 'text-white';

  const assetGlowClass = isBtc
    ? 'hover:border-bitcoin/30 hover:shadow-[0_0_50px_rgba(247,147,26,0.06)]'
    : 'hover:border-blue-500/30 hover:shadow-[0_0_50px_rgba(59,130,246,0.06)]';

  const dotColor = mode === 'live'
    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
    : isBtc
      ? 'bg-bitcoin'
      : 'bg-blue-400';

  return (
    <section
      id={isBtc ? 'market' : undefined}
      className={`min-w-0 rounded-lg border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))] p-4 shadow-card backdrop-blur transition-all duration-300 ${assetGlowClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-xs">
            <span className={`h-2 w-2 rounded-full transition-all duration-300 ${dotColor}`} />
            <span className="truncate">{mode === 'live' ? `Live ${config.pairLabel}` : config.pairLabel}</span>
          </div>
          <div className={`mt-3 flex h-10 items-center truncate font-mono text-[1.4rem] font-semibold tracking-tight transition-colors duration-200 min-[420px]:text-2xl sm:h-12 sm:text-4xl ${flashClass}`}>
            {market.usd ? formatUsd(market.usd) : showSpinner ? <LoadingSpinner size="sm" /> : '--'}
          </div>
        </div>
        <button
          onClick={reload}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-bitcoin/40 hover:bg-bitcoin/10 hover:text-white"
          aria-label={`Sync ${config.symbol} market data`}
          title="Sync"
        >
          <Activity size={14} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <CompactStat
          label="24h Change"
          value={formatPercent(market.change24h)}
          tone={positive ? 'up' : 'down'}
          icon={positive ? ArrowUpRight : ArrowDownRight}
        />
        <CompactStat
          label="24h Volume"
          value={formatCompactUsd(market.quoteVolume24h)}
        />
        <CompactStat
          label="Feed Source"
          value={error || market.provider || 'binance'}
          tone={error ? 'down' : 'neutral'}
        />
      </div>
    </section>
  );
}

interface CompactStatProps {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'neutral';
  icon?: React.ComponentType<{ size: number; className?: string }>;
}

function CompactStat({ label, value, tone = 'neutral', icon: Icon }: CompactStatProps) {
  const toneClass =
    tone === 'up'
      ? 'text-emerald-400'
      : tone === 'down'
        ? 'text-red-400'
        : 'text-zinc-300';

  return (
    <div className="min-h-[52px] min-w-0 rounded border border-white/[0.05] bg-black/20 p-2 font-mono">
      <p className="truncate text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px]">{label}</p>
      <p className={`mt-1 flex min-w-0 items-center gap-0.5 truncate text-[11px] font-semibold sm:text-xs ${toneClass}`}>
        {Icon ? <Icon size={12} className="shrink-0" /> : null}
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}
