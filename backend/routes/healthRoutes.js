const express = require('express');
const { db } = require('../config/database');

const router = express.Router();

router.get('/', (req, res) => {
  let dbStatus = 'up';

  try {
    db.prepare('SELECT 1').get();
  } catch (err) {
    dbStatus = 'down';
  }

  const uptimeSeconds = process.uptime();

  res.status(dbStatus === 'up' ? 200 : 503).json({
    status: dbStatus === 'up' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: uptimeSeconds,
    services: {
      api: 'up',
      database: dbStatus,
    },
    system: {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

module.exports = router;
