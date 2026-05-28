import { Router } from 'express';
import { getBitcoinPrice } from '../controllers/bitcoinController.js';

const router = Router();

router.get('/', getBitcoinPrice);

export default router;
