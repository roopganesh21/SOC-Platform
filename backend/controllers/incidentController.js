const {
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  getIncidentStats,
} = require('../db/queries');
const { getOrCreateIncidentExplanation } = require('../services/incidentExplanationService');

async function getAllIncidents(req, res, next) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '20', 10);
    const status = req.query.status;
    const severity = req.query.severity;

    const result = getIncidents({ page, pageSize, status, severity });

    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

async function getIncidentByIdHandler(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const incident = getIncidentById(id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    return res.status(200).json({ incident });
  } catch (err) {
    return next(err);
  }
}

async function generateExplanation(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const incident = getIncidentById(id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // For now, we do not have explicit log-to-incident linking.
    // Pass an empty relatedLogs array; incident details still provide useful context.
    const explanation = await getOrCreateIncidentExplanation(incident, []);

    return res.status(200).json({
      incidentId: id,
      explanation,
    });
  } catch (err) {
    return next(err);
  }
}

async function updateIncidentStatusHandler(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;

    const incident = getIncidentById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    updateIncidentStatus(id, status);

    const updated = getIncidentById(id);

    return res.status(200).json({ incident: updated });
  } catch (err) {
    return next(err);
  }
}

async function getStatisticsHandler(req, res, next) {
  try {
    const stats = getIncidentStats();
    return res.status(200).json(stats);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAllIncidents,
  getIncidentById: getIncidentByIdHandler,
  generateExplanation,
  updateIncidentStatus: updateIncidentStatusHandler,
  getStatistics: getStatisticsHandler,
};
