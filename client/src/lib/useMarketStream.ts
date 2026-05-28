import { useEffect, useState } from 'react';
import { BitcoinMarketData, EthereumMarketData, GasData, FearGreedData } from './types.ts';
import { getBitcoinPrice, getEthereumPrice, getDominance, getFearGreed, getGasOracle } from './api.ts';

export interface MarketStreamState {
  btc: BitcoinMarketData | null;
  eth: EthereumMarketData | null;
  gas: GasData | null;
  dominance: { btcDominance: number; ethDominance: number } | null;
  fearGreed: FearGreedData | null;
  connected: boolean;
  isPollingFallback: boolean;
  isOffline: boolean;
}

const initialState: MarketStreamState = {
  btc: null,
  eth: null,
  gas: null,
  dominance: null,
  fearGreed: null,
  connected: false,
  isPollingFallback: false,
  isOffline: false
};

const cacheKey = 'kwl.marketStream';

function readCachedState(): MarketStreamState {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
    return cached && typeof cached === 'object'
      ? { ...initialState, ...cached, connected: false, isPollingFallback: false, isOffline: !navigator.onLine }
      : { ...initialState, isOffline: !navigator.onLine };
  } catch {
    return { ...initialState, isOffline: !navigator.onLine };
  }
}

function writeCachedState(state: MarketStreamState): void {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ ...state, connected: false }));
  } catch {
    // Ignore storage issues.
  }
}

export function useMarketStream(): MarketStreamState {
  const [state, setState] = useState<MarketStreamState>(readCachedState);

  useEffect(() => {
    let source: EventSource | null = null;
    let isDisposed = false;
    let reconnectTimeout: number | null = null;
    let pollingInterval: number | null = null;
    let reconnectDelay = 2000;
    let sseFailures = 0;
    const MAX_SSE_FAILURES = 3;

    async function pollAllData() {
      if (isDisposed || document.visibilityState === 'hidden' || !navigator.onLine) {
        return;
      }
      try {
        const [btcRes, ethRes, dominanceRes, fearGreedRes, gasRes] = await Promise.allSettled([
          getBitcoinPrice(),
          getEthereumPrice(),
          getDominance(),
          getFearGreed(),
          getGasOracle()
        ]);

        const nextState = {
          btc: btcRes.status === 'fulfilled' ? btcRes.value : state.btc,
          eth: ethRes.status === 'fulfilled' ? ethRes.value : state.eth,
          dominance: dominanceRes.status === 'fulfilled' ? dominanceRes.value : state.dominance,
          fearGreed: fearGreedRes.status === 'fulfilled' ? fearGreedRes.value : state.fearGreed,
          gas: gasRes.status === 'fulfilled' ? gasRes.value : state.gas,
          connected: false,
          isPollingFallback: true,
          isOffline: false
        };

        setState(nextState);
        writeCachedState(nextState);
      } catch (err) {
        console.warn('[market stream] Fallback polling failed:', err);
      }
    }

    function startPolling() {
      if (pollingInterval) return;
      // Immediately run once
      pollAllData();
      pollingInterval = window.setInterval(pollAllData, 30000);
      setState((current) => ({ ...current, isPollingFallback: true, connected: false }));
    }

    function stopPolling() {
      if (pollingInterval) {
        window.clearInterval(pollingInterval);
        pollingInterval = null;
      }
    }

    function connect() {
      if (isDisposed || document.visibilityState === 'hidden' || !navigator.onLine) {
        return;
      }

      setState((current) => ({ ...current, isOffline: false }));

      // If we failed multiple times, use polling instead of hammering SSE
      if (sseFailures >= MAX_SSE_FAILURES) {
        startPolling();
        return;
      }

      // Guard: do not double connect
      if (source && (source.readyState === EventSource.CONNECTING || source.readyState === EventSource.OPEN)) {
        return;
      }

      if (source) {
        source.close();
      }

      stopPolling();

      source = new EventSource('/api/market/stream');

      source.onopen = () => {
        if (!isDisposed) {
          sseFailures = 0; // reset
          reconnectDelay = 2000;
          setState((current) => ({ ...current, connected: true, isPollingFallback: false }));
        }
      };

      source.onmessage = (event) => {
        if (isDisposed) return;
        try {
          const payload = JSON.parse(event.data);
          const nextState: MarketStreamState = {
            btc: payload.btc || null,
            eth: payload.eth || null,
            gas: payload.gas || null,
            dominance: payload.dominance || null,
            fearGreed: payload.fearGreed || null,
            connected: true,
            isPollingFallback: false,
            isOffline: false
          };
          setState(nextState);
          writeCachedState(nextState);
        } catch (error) {
          console.warn('[market stream] Unable to parse event:', error);
        }
      };

      source.onerror = () => {
        if (isDisposed) return;
        sseFailures++;
        
        setState((current) => ({ ...current, connected: false }));

        if (source) {
          source.close();
          source = null;
        }

        if (reconnectTimeout) {
          window.clearTimeout(reconnectTimeout);
        }

        if (sseFailures >= MAX_SSE_FAILURES) {
          console.warn('[market stream] SSE failed multiple times, falling back to REST polling');
          startPolling();
        } else {
          // Exponential backoff reconnect
          const jitter = 0.8 + Math.random() * 0.4;
          const delay = Math.min(30000, reconnectDelay * 1.5) * jitter;
          reconnectDelay = Math.min(30000, reconnectDelay * 1.5);

          reconnectTimeout = window.setTimeout(() => {
            connect();
          }, delay);
        }
      };
    }

    function disconnect() {
      if (source) {
        source.close();
        source = null;
      }
      if (reconnectTimeout) {
        window.clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      stopPolling();
      setState((current) => ({ ...current, connected: false }));
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        disconnect();
      } else {
        // Refresh data lightly once on focus
        pollAllData().finally(() => {
          // Reconnect SSE
          sseFailures = 0;
          connect();
        });
      }
    }

    function handleNetworkChange() {
      if (navigator.onLine) {
        setState((current) => ({ ...current, isOffline: false }));
        sseFailures = 0;
        connect();
      } else {
        disconnect();
        setState((current) => ({ ...current, isOffline: true, connected: false }));
      }
    }

    // Initial connection
    connect();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      isDisposed = true;
      disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, []);

  return state;
}
