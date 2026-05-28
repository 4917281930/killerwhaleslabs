import { Router } from 'express';
import {
  getBitcoinPrice,
  getDominance,
  getEthereumPrice,
  getFearGreed,
  getGasOracle,
  getTrendingCoins
} from '../controllers/bitcoinController.js';

const router = Router();

function cacheFor(seconds, swrSeconds) {
  return (_req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${swrSeconds}`);
    next();
  };
}

router.get('/btc', cacheFor(15, 30), getBitcoinPrice);
router.get('/eth', cacheFor(15, 30), getEthereumPrice);
router.get('/dominance', cacheFor(55, 60), getDominance);
router.get('/fear-greed', cacheFor(290, 300), getFearGreed);
router.get('/gas', cacheFor(25, 30), getGasOracle);
router.get('/trending', cacheFor(590, 600), getTrendingCoins);

export default router;
