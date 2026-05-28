import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useMarketStream, MarketStreamState } from '../lib/useMarketStream.ts';
import { getFearGreed, getDominance, getGasOracle, getTrendingCoins } from '../lib/api.ts';
import { FearGreedData, GasData, TrendingCoin } from '../lib/types.ts';

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

function readCachedResource<T>(cacheKey: string): T | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
    return cached && typeof cached === 'object' ? cached : null;
  } catch {
    return null;
  }
}

function writeCachedResource<T>(cacheKey: string, data: T): void {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // Ignore storage failures.
  }
}

export interface PolledResourceState<T> {
  data: T | null;
  loading: boolean;
  showSpinner: boolean;
  error: string;
  reload: () => Promise<void>;
}

export function usePolledResource<T>(
  fetcher: () => Promise<T>,
  intervalMs: number | null,
  cacheKey: string
): PolledResourceState<T> {
  const [data, setData] = useState<T | null>(() => readCachedResource<T>(cacheKey));
  const [loading, setLoading] = useState<boolean>(() => !readCachedResource<T>(cacheKey));
  const [error, setError] = useState<string>('');
  const showSpinner = useDelayedLoading(loading);
  const lastFetchedRef = useRef<number>(0);

  const load = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const next = await fetcher();
      setData(next);
      writeCachedResource(cacheKey, next);
      setError('');
      lastFetchedRef.current = Date.now();
    } catch (err: any) {
      setError(err.message || 'Feed unavailable');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [cacheKey, fetcher]);

  useEffect(() => {
    if (intervalMs == null) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    let timer: number | null = null;

    async function tick() {
      if (!active || document.visibilityState === 'hidden' || !navigator.onLine) {
        return;
      }
      try {
        const next = await fetcher();
        if (active) {
          setData(next);
          writeCachedResource(cacheKey, next);
          setError('');
          lastFetchedRef.current = Date.now();
        }
      } catch (err: any) {
        if (active) setError(err.message || 'Feed unavailable');
      } finally {
        if (active) setLoading(false);
      }
    }

    function startTimer() {
      stopTimer();
      if (intervalMs !== null) {
        timer = window.setInterval(tick, intervalMs);
      }
    }

    function stopTimer() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        stopTimer();
      } else {
        const age = Date.now() - lastFetchedRef.current;
        if (age >= (intervalMs || 0)) {
          tick();
        }
        startTimer();
      }
    }

    function handleNetworkChange() {
      if (navigator.onLine) {
        tick();
        startTimer();
      } else {
        stopTimer();
      }
    }

    tick();
    startTimer();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      active = false;
      stopTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [cacheKey, fetcher, intervalMs]);

  return { data, loading, showSpinner, error, reload: () => load(false) };
}

export interface MarketDataState {
  marketStream: MarketStreamState;
  fearGreed: PolledResourceState<FearGreedData>;
  dominance: PolledResourceState<{ btcDominance: number; ethDominance: number }>;
  gas: PolledResourceState<GasData>;
  trending: PolledResourceState<{ coins: TrendingCoin[]; updatedAt: string }>;
}

export function useMarketData(): MarketDataState {
  const marketStream = useMarketStream();

  const fearGreedResource = usePolledResource<FearGreedData>(
    getFearGreed,
    marketStream.fearGreed ? null : 300_000,
    'kwl.resource.fearGreed'
  );

  const dominanceResource = usePolledResource<{ btcDominance: number; ethDominance: number }>(
    getDominance,
    marketStream.dominance ? null : 60_000,
    'kwl.resource.dominance'
  );

  const gasResource = usePolledResource<GasData>(
    getGasOracle,
    marketStream.gas ? null : 30_000,
    'kwl.resource.gas'
  );

  const trending = usePolledResource<{ coins: TrendingCoin[]; updatedAt: string }>(
    getTrendingCoins,
    600_000,
    'kwl.resource.trending'
  );

  // Merge streamed data with polled resources for instant live updates
  const fearGreed = useMemo(() => ({
    ...fearGreedResource,
    data: marketStream.fearGreed || fearGreedResource.data,
    loading: marketStream.fearGreed ? false : fearGreedResource.loading
  }), [fearGreedResource, marketStream.fearGreed]);

  const dominance = useMemo(() => ({
    ...dominanceResource,
    data: marketStream.dominance || dominanceResource.data,
    loading: marketStream.dominance ? false : dominanceResource.loading
  }), [dominanceResource, marketStream.dominance]);

  const gas = useMemo(() => ({
    ...gasResource,
    data: marketStream.gas || gasResource.data,
    loading: marketStream.gas ? false : gasResource.loading
  }), [gasResource, marketStream.gas]);

  return {
    marketStream,
    fearGreed,
    dominance,
    gas,
    trending
  };
}
