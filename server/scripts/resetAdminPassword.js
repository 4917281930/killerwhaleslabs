import dotenv from 'dotenv';
import { db } from '../db/connection.js';
import { hashPassword } from '../utils/auth.js';

dotenv.config();

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error('ADMIN_USERNAME and ADMIN_PASSWORD must be set.');
  process.exit(1);
}

const passwordHash = hashPassword(password);
const result = db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(passwordHash, username);

if (result.changes === 0) {
  console.error(`Admin user "${username}" was not found.`);
  db.close();
  process.exit(1);
}

console.log(`Password updated for admin user "${username}".`);
db.close();
