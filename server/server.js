import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorHandler, notFoundHandler } from './utils/errors.js';
import { initializeDatabase } from './db/init.js';
import projectRoutes from './routes/projects.js';
import marketRoutes from './routes/market.js';
import adminRoutes from './routes/admin.js';
import { getBitcoinPrice } from './controllers/bitcoinController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 4000);

initializeDatabase();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true
  })
);
app.use(express.json({ limit: '650kb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/uploads/logos', express.static(path.join(__dirname, 'uploads/logos'), {
  immutable: true,
  maxAge: '1y'
}));

app.use('/api/projects', projectRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);
app.get('/api/bitcoin-price', getBitcoinPrice);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`killerwhaleslabs API running on http://localhost:${port}`);
});
