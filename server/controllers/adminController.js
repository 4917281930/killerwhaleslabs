import { findAdminByUsername } from '../services/adminService.js';
import { asyncHandler, httpError } from '../utils/errors.js';
import { createSessionToken, verifyPassword } from '../utils/auth.js';
import { clearSessionCookie, sessionCookie } from '../utils/cookies.js';
import { validateLogin } from '../utils/validation.js';

export const login = asyncHandler(async (req, res) => {
  const { username, password } = validateLogin(req.body);
  const admin = findAdminByUsername(username);

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    throw httpError(401, 'Invalid credentials');
  }

  const token = createSessionToken(admin);
  res.setHeader('Set-Cookie', sessionCookie(token));
  res.json({ success: true, data: { username: admin.username } });
});

export const logout = asyncHandler(async (_req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ success: true, data: { ok: true } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { username: req.admin.username } });
});
