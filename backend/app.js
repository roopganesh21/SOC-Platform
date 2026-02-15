const express = require('express');
const cors = require('cors');
const logRoutes = require('./routes/logRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const statsRoutes = require('./routes/statsRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const {
  securityHeaders,
  rateLimiter,
  sanitizeInput,
  apiKeyAuth,
  csrfProtection,
} = require('./middleware/securityMiddleware');

const app = express();

// Basic middleware
app.use(express.json());

// Security headers
app.use(securityHeaders());

// CORS
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin,
  })
);

// Rate limiting
app.use(rateLimiter());

// Input sanitization
app.use(sanitizeInput);

// Health routes (no auth, used for readiness / liveness)
app.use('/api/health', healthRoutes);

// API key auth for the rest of the API surface
app.use(apiKeyAuth);

// CSRF protection for state-changing operations
app.use(csrfProtection);

// Log upload routes
app.use('/api/logs', logRoutes);

// Incident routes
app.use('/api/incidents', incidentRoutes);

// Statistics routes
app.use('/api/stats', statsRoutes);

// 404 and error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
