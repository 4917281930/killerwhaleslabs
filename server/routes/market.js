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

router.get('/btc', getBitcoinPrice);
router.get('/eth', getEthereumPrice);
router.get('/dominance', getDominance);
router.get('/fear-greed', getFearGreed);
router.get('/gas', getGasOracle);
router.get('/trending', getTrendingCoins);

export default router;
