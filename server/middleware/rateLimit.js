import { RateLimiterMemory } from 'rate-limiter-flexible';

const loginLimiter = new RateLimiterMemory({
  points: 8,
  duration: 600,
  blockDuration: 600
});

const adminApiLimiter = new RateLimiterMemory({
  points: 60,
  duration: 60
});

const uploadLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60
});

const publicApiLimiter = new RateLimiterMemory({
  points: 120,
  duration: 60
});

export function loginRateLimit(req, _res, next) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';

  loginLimiter.consume(key)
    .then(() => next())
    .catch(() => {
      const error = new Error('Too many login attempts. Try again later.');
      error.status = 429;
      next(error);
    });
}

export function adminRateLimit(req, _res, next) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';

  adminApiLimiter.consume(key)
    .then(() => next())
    .catch(() => {
      const error = new Error('Too many request attempts on admin interface. Try again later.');
      error.status = 429;
      next(error);
    });
}

export function uploadRateLimit(req, _res, next) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';

  uploadLimiter.consume(key)
    .then(() => next())
    .catch(() => {
      const error = new Error('Too many logo uploads. Try again later.');
      error.status = 429;
      next(error);
    });
}

export function publicRateLimit(req, _res, next) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';

  publicApiLimiter.consume(key)
    .then(() => next())
    .catch(() => {
      const error = new Error('Too many requests. Try again later.');
      error.status = 429;
      next(error);
    });
}

