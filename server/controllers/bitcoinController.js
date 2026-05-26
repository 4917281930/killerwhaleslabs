import { fetchBitcoinPrice, fetchEthereumPrice } from '../services/bitcoinService.js';
import { fetchDominance, fetchFearGreed, fetchGasOracle, fetchTrendingCoins } from '../services/marketDataService.js';
import { asyncHandler } from '../utils/errors.js';

export const getBitcoinPrice = asyncHandler(async (_req, res) => {
  const price = await fetchBitcoinPrice();
  res.json({ success: true, data: price });
});

export const getEthereumPrice = asyncHandler(async (_req, res) => {
  const price = await fetchEthereumPrice();
  res.json({ success: true, data: price });
});

export const getDominance = asyncHandler(async (_req, res) => {
  const dominance = await fetchDominance();
  res.json({ success: true, data: dominance });
});

export const getFearGreed = asyncHandler(async (_req, res) => {
  const fearGreed = await fetchFearGreed();
  res.json({ success: true, data: fearGreed });
});

export const getGasOracle = asyncHandler(async (_req, res) => {
  const gas = await fetchGasOracle();
  res.json({ success: true, data: gas });
});

export const getTrendingCoins = asyncHandler(async (_req, res) => {
  const trending = await fetchTrendingCoins();
  res.json({ success: true, data: trending });
});
