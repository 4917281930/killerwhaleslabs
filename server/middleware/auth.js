import { findAdminById } from '../services/adminService.js';
import { parseSessionToken } from '../utils/auth.js';
import { parseCookies } from '../utils/cookies.js';
import { httpError } from '../utils/errors.js';

export function requireAdmin(req, _res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const session = parseSessionToken(cookies.kwl_session);
  if (!session?.sub) return next(httpError(401, 'Authentication required'));

  const admin = findAdminById(session.sub);
  if (!admin) return next(httpError(401, 'Authentication required'));

  req.admin = { id: admin.id, username: admin.username };
  next();
}
