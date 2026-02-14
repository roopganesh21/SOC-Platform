const express = require('express');
const {
  getIncidentStats,
  getIncidentTrendsDaily,
  getTopIpsFromLogs,
  getTopUsersFromLogs,
  getSeverityDistribution,
} = require('../db/queries');

const router = express.Router();

// GET /api/stats/overview
router.get('/overview', (req, res, next) => {
  try {
    const stats = getIncidentStats();

    return res.status(200).json({
      totalIncidents: stats.total || 0,
      bySeverity: stats.bySeverity,
      byStatus: stats.byStatus,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/stats/trends
router.get('/trends', (req, res, next) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const points = getIncidentTrendsDaily(Number.isNaN(days) ? 30 : days);

    return res.status(200).json({
      rangeDays: Number.isNaN(days) ? 30 : days,
      points,
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/stats/top-ips
router.get('/top-ips', (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const items = getTopIpsFromLogs(Number.isNaN(limit) ? 10 : limit);

    return res.status(200).json({ items });
  } catch (err) {
    return next(err);
  }
});

// GET /api/stats/top-users
router.get('/top-users', (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const items = getTopUsersFromLogs(Number.isNaN(limit) ? 10 : limit);

    return res.status(200).json({ items });
  } catch (err) {
    return next(err);
  }
});

// GET /api/stats/severity-distribution
router.get('/severity-distribution', (req, res, next) => {
  try {
    const items = getSeverityDistribution();

    return res.status(200).json({ items });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
