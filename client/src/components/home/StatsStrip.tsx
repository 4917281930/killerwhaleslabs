import React from 'react';
import { Zap, Shield } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner.tsx';
import { formatNumber, formatPercent } from '../../lib/format.ts';

interface StatsStripProps {
  fearGreed: {
    data: { value: number; label: string } | null;
    loading: boolean;
    error: string;
  };
  dominance: {
    data: { btcDominance: number; ethDominance: number } | null;
    loading: boolean;
    error: string;
  };
  gas: {
    data: { slow: number; standard: number; fast: number } | null;
    loading: boolean;
    error: string;
  };
}

export function StatsStrip({ fearGreed, dominance, gas }: StatsStripProps) {
  const fgValue = fearGreed.data?.value;
  const fgMarker = typeof fgValue === 'number' ? Math.min(100, Math.max(0, fgValue)) : 0;

  return (
    <section className="bg-ink px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Fear & Greed */}
          <div className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 font-mono">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Sentiment Index</span>
            <div className="mt-3 flex items-baseline gap-2">
              {fearGreed.loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <span className="text-2xl font-semibold text-white">{fgValue ?? '--'}</span>
                  <span className="text-xs text-zinc-400">{fearGreed.data?.label || 'Fear & Greed'}</span>
                </>
              )}
            </div>
            <div className="relative mt-3 h-1.5 overflow-visible rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400">
              {typeof fgValue === 'number' && (
                <span
                  className="absolute top-1/2 h-3.5 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-glow"
                  style={{ left: `calc(${fgMarker}% - 3px)` }}
                />
              )}
            </div>
          </div>

          {/* BTC Dominance */}
          <div className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 font-mono">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">BTC Dominance</span>
            <div className="mt-3">
              {dominance.loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <span className="text-2xl font-semibold text-white">
                  {typeof dominance.data?.btcDominance === 'number'
                    ? formatPercent(dominance.data.btcDominance)
                    : '--'}
                </span>
              )}
            </div>
            <span className="mt-2 text-[10px] text-zinc-500">CoinGecko Market Share</span>
          </div>

          {/* ETH Dominance */}
          <div className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 font-mono">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">ETH Dominance</span>
            <div className="mt-3">
              {dominance.loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <span className="text-2xl font-semibold text-white">
                  {typeof dominance.data?.ethDominance === 'number'
                    ? formatPercent(dominance.data.ethDominance)
                    : '--'}
                </span>
              )}
            </div>
            <span className="mt-2 text-[10px] text-zinc-500">CoinGecko Market Share</span>
          </div>

          {/* Gas Tracker */}
          <div className="flex flex-col justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Gas Tracker</span>
              <Zap size={11} className="text-bitcoin" />
            </div>
            <div className="mt-3 flex items-center justify-between gap-1">
              {gas.loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <div className="text-center flex-1">
                    <span className="block text-[9px] uppercase tracking-wider text-zinc-500">Slow</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      {typeof gas.data?.slow === 'number' ? formatNumber(gas.data.slow) : '--'}
                    </span>
                  </div>
                  <div className="text-center border-x border-white/[0.05] flex-1">
                    <span className="block text-[9px] uppercase tracking-wider text-zinc-500">Std</span>
                    <span className="text-xs font-semibold text-yellow-400">
                      {typeof gas.data?.standard === 'number' ? formatNumber(gas.data.standard) : '--'}
                    </span>
                  </div>
                  <div className="text-center flex-1">
                    <span className="block text-[9px] uppercase tracking-wider text-zinc-500">Fast</span>
                    <span className="text-xs font-semibold text-red-400">
                      {typeof gas.data?.fast === 'number' ? formatNumber(gas.data.fast) : '--'}
                    </span>
                  </div>
                </>
              )}
            </div>
            <span className="mt-2 text-[9px] text-zinc-500 text-right">Ethereum Network</span>
          </div>
        </div>
      </div>
    </section>
  );
}
