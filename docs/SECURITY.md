# Security Hardening

This document summarizes the main security measures applied to the SOC platform backend and how to operate them safely.

## HTTP Security Middleware

- **Helmet** (`securityHeaders`)
  - Adds standard security headers (X-Frame-Options, Referrer-Policy, etc.).
  - Content Security Policy (CSP) is disabled in development to avoid breaking tooling and should be enabled in production by setting `NODE_ENV=production`.
- **Rate limiting** (`rateLimiter`)
  - Default: **100 requests / 15 minutes / IP**.
  - Tunable via env vars:
    - `RATE_LIMIT_WINDOW_MINUTES` – window size in minutes.
    - `RATE_LIMIT_MAX` – max requests per IP per window.
- **Input sanitization** (`sanitizeInput`)
  - Sanitizes `req.query`, `req.params`, and `req.body` by escaping HTML special characters.
  - Helps reduce the impact of reflected/stored XSS if unsanitized content is ever rendered in a UI.

## SQL Injection Prevention

- All application database access goes through `backend/db/queries.js`.
- Queries use **prepared statements with positional parameters** (`?`) instead of string concatenation.
- No user-controlled values are interpolated directly into SQL strings.
- The only dynamic SQL is in development tooling scripts (e.g., table inspection) and does not use user input.

## Input Sanitizer Utilities

Defined in `backend/utils/sanitizer.js`:

- `sanitizeLogContent(content)`
  - Strips `<script>...</script>` blocks and simple inline event handlers.
  - Used when returning sample log lines from the upload endpoint to reduce XSS risk.
- `validateIpAddress(value)`
  - Uses Node's `net.isIP` to validate IPv4 / IPv6 strings.
- `validateUsername(value)`
  - Allows usernames matching `[a-zA-Z0-9_.-]{1,64}`.
- `escapeSpecialChars(value)`
  - Escapes `&`, `<`, `>`, `"`, and `'` for safe HTML rendering.
- `sanitizeObject(obj)`
  - Recursively escapes string values inside objects/arrays.

## API Key Authentication

- Basic API key authentication is implemented in `backend/middleware/securityMiddleware.js` as `apiKeyAuth`.
- Behaviour:
  - Reads expected key from `API_KEY` env var.
  - If **no** `API_KEY` is configured, authentication is **disabled** (useful for local development and tests).
  - If `API_KEY` **is** set, every request (except `/api/health`) must include:
    - Header: `X-API-Key: <value-of-API_KEY>`
  - Invalid or missing keys result in `401 Unauthorized` with a JSON error.
- Frontend / API clients should be configured to send this header when running against a secured backend.

## CSRF Protection

- CSRF protection is implemented in `csrfProtection` middleware.
- Behaviour:
  - Only applies to **state-changing methods**: `POST`, `PUT`, `PATCH`, `DELETE`.
  - Controlled via env var `CSRF_SECRET`:
    - If not set, CSRF checks are **disabled** (suitable for non-browser clients / local development).
    - If set, every state-changing request must include header:
      - `X-CSRF-Token: <value-of-CSRF_SECRET>`
    - Missing or incorrect tokens return `403 Invalid CSRF token`.
- Since the API is currently stateless and does not use browser cookies, CSRF risk is low, but this mechanism is available for hardened deployments.

## CORS

- CORS is configured in `backend/app.js`:
  - Allowed origin defaults to `*` for local usage.
  - Can be restricted via `CORS_ORIGIN` env var (single origin string).

## Health Endpoint

- `/api/health` is intentionally **unauthenticated**.
  - Used for readiness and liveness checks by orchestrators.
  - Protected by general rate limiting to avoid abuse.

## Recommended Production Settings

- Set the following env vars in production:
  - `API_KEY` – strong random string; distribute securely to trusted clients.
  - `CSRF_SECRET` – strong random string; configure clients to send `X-CSRF-Token`.
  - `CORS_ORIGIN` – locked down to your frontend origin (e.g., `https://soc.example.com`).
  - `RATE_LIMIT_WINDOW_MINUTES` and `RATE_LIMIT_MAX` – tuned to expected traffic.
  - `NODE_ENV=production` – enables stricter Helmet defaults.

- Regularly review logs and metrics for:
  - Excessive `429 Too Many Requests` (adjust rate limit or investigate abuse).
  - Repeated `401` or `403` responses (potential credential or CSRF issues).

This setup is intentionally simple but provides a solid baseline: secure headers, rate limiting, sanitized inputs, parameterized SQL, optional API key authentication, and optional CSRF protection for state-changing operations.
