import { AlertCircle, TrendingUp, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { getDominance, getFearGreed, getGasOracle, getTrendingCoins } from '../lib/api.js';
import { formatDateTime, formatNumber, formatPercent, formatUsd } from '../lib/format.js';
import { LoadingSpinner } from './LoadingSpinner.jsx';
import { MarketPanel } from './MarketPanel.jsx';

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

function usePolledResource(fetcher, intervalMs) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const showSpinner = useDelayedLoading(loading);

  const load = useCallback(async () => {
    try {
      const next = await fetcher();
      setData(next);
      setError('');
    } catch (err) {
      setError(err.message || 'Feed unavailable');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    let active = true;
    let timer;

    async function tick() {
      try {
        const next = await fetcher();
        if (active) {
          setData(next);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message || 'Feed unavailable');
      } finally {
        if (active) setLoading(false);
      }
    }

    tick();
    timer = window.setInterval(tick, intervalMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [fetcher, intervalMs]);

  return { data, loading, showSpinner, error, reload: load };
}

export function HomeMarketDashboard() {
  const fearGreed = usePolledResource(getFearGreed, 300_000);
  const dominance = usePolledResource(getDominance, 60_000);
  const gas = usePolledResource(getGasOracle, 30_000);
  const trending = usePolledResource(getTrendingCoins, 600_000);

  return (
    <section className="bg-ink px-3 pb-14 text-white sm:px-6 sm:pb-16 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <MarketPanel />
          <MarketPanel asset="ETH" />
        </div>

        <MarketChipRow fearGreed={fearGreed} dominance={dominance} />
        <GasTracker resource={gas} />
        <TrendingCoins resource={trending} />
      </div>
    </section>
  );
}

function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-lg border border-white/[0.09] bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.032))] p-4 shadow-card backdrop-blur sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

function PanelHeader({ icon: Icon, label, title, error }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-zinc-400">
          <Icon size={14} className="text-bitcoin" />
          {label}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">{title}</h2>
      </div>
      {error ? <AlertCircle size={18} className="shrink-0 text-red-300" /> : null}
    </div>
  );
}

function MarketChipRow({ fearGreed, dominance }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <FearGreedChip resource={fearGreed} />
      <MarketChip label="BTC Dom" value={formatOptionalPercent(dominance.data?.btcDominance)} subLabel="CoinGecko" loading={dominance.showSpinner} error={dominance.error} />
      <MarketChip label="ETH Dom" value={formatOptionalPercent(dominance.data?.ethDominance)} subLabel="CoinGecko" loading={dominance.showSpinner} error={dominance.error} />
    </div>
  );
}

function MarketChip({ label, value, subLabel, loading, error, children }) {
  return (
    <div className="flex h-20 min-w-0 flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.045] p-2.5 sm:p-3">
      <p className="truncate text-[8px] font-medium uppercase tracking-[0.14em] text-zinc-500 sm:text-[10px] sm:tracking-[0.18em]">{label}</p>
      <div className="min-w-0">
        {loading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <p className={`truncate font-mono text-lg font-semibold sm:text-2xl ${error ? 'text-red-300' : 'text-white'}`}>{error ? '--' : value}</p>
        )}
        <p className={`mt-0.5 truncate text-[10px] sm:text-xs ${error ? 'text-red-300' : 'text-zinc-400'}`}>{error || subLabel}</p>
      </div>
      {children}
    </div>
  );
}

function FearGreedChip({ resource }) {
  const value = resource.data?.value;
  const marker = typeof value === 'number' ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <MarketChip
      label="Fear & Greed"
      value={typeof value === 'number' ? value : '--'}
      subLabel={resource.data?.label || 'Sentiment'}
      loading={resource.showSpinner}
      error={resource.error}
    >
      <div className="relative mt-1 h-1 overflow-visible rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400">
        <span className="absolute top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-full bg-white shadow-glow" style={{ left: `calc(${marker}% - 2px)` }} />
      </div>
    </MarketChip>
  );
}

function GasTracker({ resource }) {
  const tiers = [
    { label: 'Slow', value: resource.data?.slow, className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' },
    { label: 'Standard', value: resource.data?.standard, className: 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200' },
    { label: 'Fast', value: resource.data?.fast, className: 'border-red-400/20 bg-red-400/10 text-red-300' }
  ];

  return (
    <Panel className="p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 sm:text-xs">
            <Zap size={13} className="text-bitcoin" />
            Ethereum
          </p>
          <h2 className="mt-1 truncate text-base font-semibold tracking-tight text-white sm:text-lg">ETH Gas Tracker</h2>
        </div>
        {resource.error ? <AlertCircle size={17} className="shrink-0 text-red-300" /> : null}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {tiers.map((tier) => (
          <div key={tier.label} className={`min-w-0 rounded border px-2.5 py-2.5 sm:px-3 ${tier.className}`}>
            <p className="truncate text-[9px] font-medium uppercase tracking-[0.14em] sm:text-[10px]">{tier.label}</p>
            <p className="mt-1.5 truncate font-mono text-lg font-semibold sm:text-2xl">{typeof tier.value === 'number' ? formatNumber(tier.value) : '--'} <span className="text-[10px] font-medium sm:text-xs">Gwei</span></p>
          </div>
        ))}
      </div>
      <p className={`mt-3 truncate text-xs ${resource.error ? 'text-red-300' : 'text-zinc-500'}`}>{resource.error || `Updated ${resource.data?.updatedAt ? formatDateTime(resource.data.updatedAt) : '--'} · 30s refresh`}</p>
    </Panel>
  );
}

function TrendingCoins({ resource }) {
  const coins = resource.data?.coins || [];

  return (
    <Panel>
      <PanelHeader icon={TrendingUp} label="CoinGecko" title="Trending Coins" error={resource.error} />
      <div className="mt-4 overflow-hidden rounded border border-white/[0.07] bg-black/18">
        {resource.showSpinner ? (
          <div className="grid min-h-44 place-items-center">
            <LoadingSpinner />
          </div>
        ) : coins.length === 0 ? (
          <div className="p-5 text-center text-sm text-zinc-500">Trending feed unavailable.</div>
        ) : (
          coins.map((coin) => <TrendingRow key={coin.id || coin.rank} coin={coin} />)
        )}
      </div>
      <StatusText error={resource.error} fallback={`Updated ${resource.data?.updatedAt ? formatDateTime(resource.data.updatedAt) : '--'}; polls every 10 minutes.`} />
    </Panel>
  );
}

function TrendingRow({ coin }) {
  const negative = typeof coin.change24h === 'number' && coin.change24h < 0;

  return (
    <div className="grid min-h-[52px] grid-cols-[1.5rem_1.75rem_minmax(0,1fr)_5.5rem_4.5rem] items-center gap-2 border-b border-white/[0.06] px-3 py-2 last:border-b-0 sm:grid-cols-[2rem_2rem_minmax(0,1fr)_7rem_5.5rem] sm:gap-3">
      <span className="text-xs font-medium text-zinc-600">{coin.rank}</span>
      {coin.thumb ? <img src={coin.thumb} alt="" className="h-6 w-6 rounded-full" /> : <span className="h-6 w-6 rounded-full bg-bitcoin/15" />}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{coin.name}</p>
        <p className="truncate text-[10px] uppercase tracking-[0.16em] text-zinc-500">{coin.symbol}</p>
      </div>
      <span className="truncate text-right text-xs font-medium text-zinc-300 sm:text-sm">{formatCoinPrice(coin.priceUsd)}</span>
      <span className={`truncate text-right text-xs font-semibold sm:text-sm ${negative ? 'text-red-300' : 'text-emerald-300'}`}>{formatPercent(coin.change24h)}</span>
    </div>
  );
}

function StatusText({ error, fallback }) {
  return <p className={`mt-4 text-sm ${error ? 'text-red-300' : 'text-zinc-500'}`}>{error || fallback}</p>;
}

function formatOptionalPercent(value) {
  return typeof value === 'number' ? formatPercent(value) : '--';
}

function formatCoinPrice(value) {
  if (typeof value !== 'number') return '--';
  if (value > 0 && value < 0.01) return `$${value.toPrecision(3)}`;
  return formatUsd(value);
}
