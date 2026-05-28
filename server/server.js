import crypto from 'node:crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getBitcoinPrice } from './controllers/bitcoinController.js';
import { db } from './db/connection.js';
import { initializeDatabase } from './db/init.js';
import adminRoutes from './routes/admin.js';
import marketRoutes from './routes/market.js';
import marketStreamRouter from './routes/marketStream.js';
import projectRoutes from './routes/projects.js';
import { validateEnv } from './utils/env.js';
import { errorHandler, notFoundHandler } from './utils/errors.js';
import { parseCookies, csrfCookie } from './utils/cookies.js';
import { publicRateLimit } from './middleware/rateLimit.js';

dotenv.config();
validateEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);
const port = Number(process.env.PORT || 4000);
const clientOrigin = process.env.CLIENT_ORIGIN;

if (!clientOrigin) {
  console.warn('[startup] CLIENT_ORIGIN is not set; set it explicitly for the intended frontend origin.');
}

if (process.env.NODE_ENV === 'production' && !clientOrigin) {
  throw new Error('CLIENT_ORIGIN env var must be set in production');
}

initializeDatabase();
setInterval(() => {
  try {
    db.prepare("DELETE FROM revoked_sessions WHERE revoked_at < datetime('now', '-13 hours')").run();
  } catch (err) {
    console.warn('[cleanup] revoked_sessions cleanup failed:', err.message);
  }
}, 6 * 60 * 60 * 1000);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  cors({
    origin: clientOrigin || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json({ limit: '650kb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss://stream.binance.com:9443 https://stream.binance.com https://api.binance.com https://api.coingecko.com https://api.alternative.me https://api.etherscan.io; font-src 'self' data:; frame-ancestors 'none'"
  );
  next();
});

app.get('/api/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.status(200).json({ success: true, data: { status: 'ok', db: 'ok' } });
  } catch {
    res.status(503).json({ success: false, data: { status: 'error', db: 'unavailable' } });
  }
});

app.use('/uploads/logos', express.static(path.join(__dirname, 'uploads/logos'), {
  immutable: true,
  maxAge: '1y'
}));

app.use('/api/admin', (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.kwl_csrf) {
    const csrfToken = crypto.randomBytes(24).toString('hex');
    res.append('Set-Cookie', csrfCookie(csrfToken, req));
  }
  next();
});

app.use('/api/projects', publicRateLimit, projectRoutes);
app.use('/api/market', publicRateLimit, marketStreamRouter);
app.use('/api/market', publicRateLimit, marketRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/bitcoin-price', publicRateLimit, getBitcoinPrice);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`killerwhaleslabs API running on http://localhost:${port}`);
  if (process.send) process.send('ready');
});

function shutdown(signal) {
  console.log(`[shutdown] ${signal} received - closing server`);
  server.close(() => {
    console.log('[shutdown] HTTP server closed');
    db.close();
    console.log('[shutdown] SQLite closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[shutdown] Forced exit after timeout');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
