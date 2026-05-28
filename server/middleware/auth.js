import { findAdminById } from '../services/adminService.js';
import { isTokenRevoked, parseSessionToken } from '../utils/auth.js';
import { parseCookies } from '../utils/cookies.js';
import { httpError } from '../utils/errors.js';

export function requireAdmin(req, _res, next) {
  // CSRF / Origin protection for mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    let requestOrigin = origin;

    if (!requestOrigin && referer) {
      try {
        requestOrigin = new URL(referer).origin;
      } catch {
        // Ignore parsing failures
      }
    }

    if (!requestOrigin || requestOrigin !== allowedOrigin) {
      return next(httpError(403, 'Access denied: Invalid request origin (CSRF protection)'));
    }

    const cookies = parseCookies(req.headers.cookie);
    const csrfCookieVal = cookies.kwl_csrf;
    const csrfHeaderVal = req.headers['x-csrf-token'];

    if (!csrfCookieVal || !csrfHeaderVal || csrfCookieVal !== csrfHeaderVal) {
      return next(httpError(403, 'Access denied: CSRF validation failed (Double-Submit mismatch)'));
    }
  }

  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies.kwl_session;
  const session = parseSessionToken(rawToken);
  if (!session?.sub) return next(httpError(401, 'Authentication required'));
  if (isTokenRevoked(rawToken)) return next(httpError(401, 'Authentication required'));

  const admin = findAdminById(session.sub);
  if (!admin) return next(httpError(401, 'Authentication required'));

  req.admin = { id: admin.id, username: admin.username };
  next();
}
