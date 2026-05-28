import React, { memo, useState } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { TrendingCoin } from '../../lib/types.ts';
import { formatPrice, formatVolume, formatPercent } from '../../lib/format.ts';
import { LoadingSpinner } from '../ui/LoadingSpinner.tsx';
import { Card } from '../ui/Card.tsx';

interface MarketTickerProps {
  trending: {
    data: { coins: TrendingCoin[]; updatedAt: string } | null;
    loading: boolean;
    showSpinner: boolean;
    error: string;
  };
}

export function MarketTicker({ trending }: MarketTickerProps) {
  const coins = trending.data?.coins || [];

  return (
    <Card className="p-5 border-white/[0.08]">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 font-mono">
            <TrendingUp size={14} className="text-bitcoin" />
            Gecko Terminal
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white font-sans">Trending Assets</h2>
        </div>
        {trending.error && <AlertCircle size={18} className="shrink-0 text-red-400 animate-pulse" />}
      </div>

      <div className="overflow-hidden rounded border border-white/[0.05] bg-black/20 p-2.5">
        {trending.showSpinner ? (
          <div className="grid min-h-[176px] place-items-center">
            <LoadingSpinner size="sm" />
          </div>
        ) : coins.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 font-mono">
            Trending coins currently unavailable.
          </div>
        ) : (
          <TrendingCoinList coins={coins} />
        )}
      </div>

      <p className={`mt-4 text-[10px] font-mono ${trending.error ? 'text-red-400' : 'text-zinc-500'}`}>
        {trending.error || `Updated ${trending.data?.updatedAt ? new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(trending.data.updatedAt)) : '--'} · Polls every 10m`}
      </p>
    </Card>
  );
}

function hideBrokenImage(event: React.SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.hidden = true;
}

const TrendingCoinList = memo(function TrendingCoinList({ coins }: { coins: TrendingCoin[] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleCoins = expanded ? coins : coins.slice(0, 7);

  return (
    <div className="font-mono">
      <div className="flex items-center gap-2 border-b border-white/10 px-1 pb-2">
        <span className="w-5 flex-shrink-0" />
        <span className="h-5 w-5 flex-shrink-0" />
        <span className="min-w-0 flex-1 text-[9px] uppercase tracking-widest text-zinc-500">Asset</span>
        <span className="w-24 flex-shrink-0 text-right text-[9px] uppercase tracking-widest text-zinc-500 sm:w-28">Price / 24h</span>
        <span className="w-16 flex-shrink-0 text-right text-[9px] uppercase tracking-widest text-zinc-500">Vol 24h</span>
      </div>
      <div className="transition-opacity">
        {visibleCoins.map((coin) => (
          <TrendingRow key={coin.id || coin.rank} coin={coin} />
        ))}
      </div>
      {coins.length > 7 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 w-full rounded border border-white/[0.05] py-2 text-xs text-zinc-500 transition-colors hover:bg-white/[0.02] hover:text-zinc-300"
        >
          {expanded ? 'Show Less ↑' : `Show More (${coins.length - 7} coins) ↓`}
        </button>
      )}
    </div>
  );
});

function TrendingRow({ coin }: { coin: TrendingCoin }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.05] py-2.5 last:border-0">
      <span className="w-5 flex-shrink-0 text-right text-[11px] text-zinc-600">{coin.rank}</span>
      <div className="h-5.5 w-5.5 flex-shrink-0 overflow-hidden rounded-full bg-white/[0.04] grid place-items-center">
        {coin.thumb ? (
          <img
            src={coin.thumb}
            alt={coin.symbol}
            width={20}
            height={20}
            loading="lazy"
            className="h-5 w-5 object-cover rounded-full"
            onError={hideBrokenImage}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold leading-tight text-white">{coin.name}</p>
        <p className="truncate text-[9px] leading-tight text-zinc-500 uppercase">
          {coin.symbol}{coin.marketCapRank ? ` · #${coin.marketCapRank}` : ''}
        </p>
      </div>
      <div className="w-24 flex-shrink-0 text-right sm:w-28">
        <p className="text-[11px] font-semibold leading-tight text-zinc-300">{formatPrice(coin.priceUsd)}</p>
        <p className={`text-[10px] leading-tight ${coin.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {coin.change24h != null ? formatPercent(coin.change24h) : '—'}
        </p>
      </div>
      <div className="w-16 flex-shrink-0 text-right">
        <p className="text-[9px] leading-tight text-zinc-600">Volume</p>
        <p className="truncate text-[10px] leading-tight text-zinc-400">{formatVolume(coin.volumeUsd)}</p>
      </div>
    </div>
  );
}
