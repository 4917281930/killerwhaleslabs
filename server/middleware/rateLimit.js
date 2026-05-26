const attempts = new Map();

export function loginRateLimit(req, _res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxAttempts = 8;
  const record = attempts.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count += 1;
  attempts.set(key, record);

  if (record.count > maxAttempts) {
    const error = new Error('Too many login attempts. Try again later.');
    error.status = 429;
    return next(error);
  }

  next();
}
