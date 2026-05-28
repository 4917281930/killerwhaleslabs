import { Router } from 'express';
import { fetchBitcoinPrice, fetchEthereumPrice } from '../services/bitcoinService.js';
import { fetchDominance, fetchFearGreed, fetchGasOracle } from '../services/marketDataService.js';

const router = Router();
const clients = new Set();
const zombieResets = new WeakMap();
const ZOMBIE_TIMEOUT_MS = 10 * 60 * 1000;

// NOTE: Connection tracking (clients.size) is per-process. On PM2 cluster mode each worker
// tracks its own count independently. The 500 cap applies per worker,
// not across the whole cluster. Use a shared store (e.g. Redis) if a
// global cap is needed.
let interval = null;

async function buildPayload() {
  const results = await Promise.allSettled([
    fetchBitcoinPrice(),
    fetchEthereumPrice(),
    fetchGasOracle(),
    fetchDominance(),
    fetchFearGreed()
  ]);

  const [btc, eth, gas, dominance, fearGreed] = results.map((result) => (
    result.status === 'fulfilled' ? result.value : null
  ));

  return { btc, eth, gas, dominance, fearGreed };
}

function writeEvent(res, payload) {
  try {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    zombieResets.get(res)?.();
    return true;
  } catch {
    clients.delete(res);
    return false;
  }
}

async function broadcastMarketSnapshot(targets = clients) {
  const payload = await buildPayload();
  for (const res of targets) writeEvent(res, payload);
}

function startInterval() {
  if (interval) return;
  interval = setInterval(() => {
    if (clients.size === 0) {
      clearInterval(interval);
      interval = null;
      return;
    }

    broadcastMarketSnapshot().catch((error) => {
      console.warn('[market stream] Unable to broadcast snapshot:', error.message);
    });
  }, 20_000);
}

router.get('/stream', (req, res) => {
  if (clients.size >= 500) {
    res.status(503).end();
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  clients.add(res);
  startInterval();

  const heartbeatInterval = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30_000);
  let closed = false;
  let zombieTimer = null;

  function cleanupClient() {
    if (closed) return;
    closed = true;
    clients.delete(res);
    clearInterval(heartbeatInterval);
    clearTimeout(zombieTimer);
    zombieResets.delete(res);
  }

  function resetZombieTimer() {
    clearTimeout(zombieTimer);
    zombieTimer = setTimeout(() => {
      cleanupClient();
      res.socket?.destroy();
    }, ZOMBIE_TIMEOUT_MS);
  }

  zombieResets.set(res, resetZombieTimer);
  resetZombieTimer();

  broadcastMarketSnapshot(new Set([res])).catch((error) => {
    console.warn('[market stream] Unable to send initial snapshot:', error.message);
    cleanupClient();
  });

  res.on('close', () => {
    cleanupClient();
  });
});

export default router;
