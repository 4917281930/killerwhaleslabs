import crypto from 'node:crypto';
import { db } from '../db/connection.js';

const keyLength = 64;

function getSecret() {
  return process.env.SESSION_SECRET || 'dev-session-secret-change-me';
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, keyLength).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = String(storedHash || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;

  const derived = crypto.scryptSync(password, salt, keyLength);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export function revokeToken(token) {
  const tokenHash = hashToken(token);
  db.prepare('INSERT OR IGNORE INTO revoked_sessions (token_hash) VALUES (?)').run(tokenHash);
}

export function isTokenRevoked(token) {
  const tokenHash = hashToken(token);
  return Boolean(db.prepare('SELECT 1 FROM revoked_sessions WHERE token_hash = ?').get(tokenHash));
}

export function createSessionToken(admin) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: admin.id,
      username: admin.username,
      exp: Date.now() + 1000 * 60 * 60 * 12
    })
  ).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

export function parseSessionToken(token) {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}
