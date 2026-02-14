const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logRoutes = require('./routes/logRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const statsRoutes = require('./routes/statsRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Basic middleware
app.use(express.json());

// Security headers
app.use(helmet());

// CORS
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin: corsOrigin,
  })
);

// Rate limiting
const windowMinutes = parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES || '15', 10);
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

const limiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  max: maxRequests,
});

app.use(limiter);

// Health routes
app.use('/api/health', healthRoutes);

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
