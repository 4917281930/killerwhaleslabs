import crypto from 'node:crypto';
import { findAdminByUsername } from '../services/adminService.js';
import { asyncHandler, httpError } from '../utils/errors.js';
import { createSessionToken, revokeToken, verifyPassword } from '../utils/auth.js';
import { clearSessionCookie, parseCookies, sessionCookie, csrfCookie, clearCsrfCookie } from '../utils/cookies.js';
import { validateLogin } from '../utils/validation.js';

export const login = asyncHandler(async (req, res) => {
  const { username, password } = validateLogin(req.body);
  const admin = findAdminByUsername(username);

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    throw httpError(401, 'Invalid credentials');
  }

  // Session rotation: revoke old token if exists
  const oldToken = parseCookies(req.headers.cookie).kwl_session;
  if (oldToken) {
    try {
      revokeToken(oldToken);
    } catch (error) {
      console.warn('[auth] Unable to revoke old session token:', error.message);
    }
  }

  const token = createSessionToken(admin);
  const csrfToken = crypto.randomBytes(24).toString('hex');

  res.setHeader('Set-Cookie', [
    sessionCookie(token, req),
    csrfCookie(csrfToken, req)
  ]);
  res.json({ success: true, data: { username: admin.username } });
});

export const logout = asyncHandler(async (req, res) => {
  const rawToken = parseCookies(req.headers.cookie).kwl_session;
  if (rawToken) {
    try {
      revokeToken(rawToken);
    } catch (error) {
      console.warn('[auth] Unable to revoke session token:', error.message);
    }
  }

  res.setHeader('Set-Cookie', [
    clearSessionCookie(req),
    clearCsrfCookie(req)
  ]);
  res.json({ success: true, data: { ok: true } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { username: req.admin.username } });
});
