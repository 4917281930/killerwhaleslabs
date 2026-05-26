import dotenv from 'dotenv';
import { initializeDatabase } from './init.js';

dotenv.config();
initializeDatabase();
console.log('Database initialized and seed data ensured.');
