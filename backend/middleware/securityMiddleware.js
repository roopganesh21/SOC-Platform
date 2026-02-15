const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sanitizeObject } = require('../utils/sanitizer');

function securityHeaders() {
  return helmet({
    // Disable CSP in development to avoid breaking bundlers; enable by default in production.
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  });
}

function rateLimiter() {
  const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10);
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

function sanitizeInput(req, res, next) {
  try {
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  } catch (err) {
    next(err);
  }
}

function apiKeyAuth(req, res, next) {
  const configuredKey = process.env.API_KEY;
  // If no API key is configured, skip enforcement (useful for local development).
  if (!configuredKey) {
    return next();
  }

  const presentedKey = req.header('x-api-key');
  if (!presentedKey || presentedKey !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  const secret = process.env.CSRF_SECRET;
  // If not configured, treat CSRF protection as disabled (development / non-browser clients).
  if (!secret) {
    return next();
  }

  const token = req.header('x-csrf-token');
  if (!token || token !== secret) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  return next();
}

module.exports = {
  securityHeaders,
  rateLimiter,
  sanitizeInput,
  apiKeyAuth,
  csrfProtection,
};
