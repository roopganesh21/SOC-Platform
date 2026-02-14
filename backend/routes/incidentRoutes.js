const express = require('express');
const {
  getAllIncidents,
  getIncidentById,
  generateExplanation,
  updateIncidentStatus,
  getStatistics,
} = require('../controllers/incidentController');
const {
  validatePagination,
  validateIncidentFilters,
  validateIncidentIdParam,
  validateIncidentStatusBody,
  handleValidation,
} = require('../middleware/validationMiddleware');

const router = express.Router();

// GET /api/incidents
router.get(
  '/',
  [...validatePagination, ...validateIncidentFilters, handleValidation],
  getAllIncidents
);

// GET /api/incidents/stats
router.get('/stats', getStatistics);

// GET /api/incidents/:id
router.get(
  '/:id',
  [...validateIncidentIdParam, handleValidation],
  getIncidentById
);

// POST /api/incidents/:id/explain
router.post(
  '/:id/explain',
  [...validateIncidentIdParam, handleValidation],
  generateExplanation
);

// PATCH /api/incidents/:id/status
router.patch(
  '/:id/status',
  [...validateIncidentIdParam, ...validateIncidentStatusBody, handleValidation],
  updateIncidentStatus
);

module.exports = router;
