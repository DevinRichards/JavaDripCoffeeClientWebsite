const DEFAULT_DEV_ORIGINS = ['http://localhost:5181', 'http://localhost:4173'];

function parseAllowedOrigins(rawOrigins) {
  if (!rawOrigins) return DEFAULT_DEV_ORIGINS;

  return String(rawOrigins)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function createRateLimiter({
  windowMs,
  max,
  message = 'Too many requests. Please try again in a few minutes.',
  skip = () => false,
}) {
  const hits = new Map();

  // Evict expired entries every windowMs to prevent unbounded memory growth.
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits.entries()) {
      if (val.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return function rateLimiter(req, res, next) {
    if (skip(req)) return next();

    const now = Date.now();
    const key = `${getClientIp(req)}:${req.method}:${req.baseUrl || ''}${req.path || ''}`;
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    return next();
  };
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

module.exports = {
  createRateLimiter,
  parseAllowedOrigins,
  securityHeaders,
};
