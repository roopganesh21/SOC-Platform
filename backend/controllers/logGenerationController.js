const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');

const {
  SCENARIO_TYPES,
  listAvailableScenarios,
  generateLogsFromScenario,
  generateAndAnalyze,
  getGeneratedLogFiles,
  deleteGeneratedLogFile,
} = require('../services/logGenerationService');

function logInfo(message, meta = {}) {
  // eslint-disable-next-line no-console
  console.info(`[log-generation] ${message}`, meta);
}

function logWarn(message, meta = {}) {
  // eslint-disable-next-line no-console
  console.warn(`[log-generation] ${message}`, meta);
}

function logError(message, meta = {}) {
  // eslint-disable-next-line no-console
  console.error(`[log-generation] ${message}`, meta);
}

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.param, message: e.msg })),
    });
  }
  return next();
}

// 5 generations per minute (per IP) for long-running generation endpoints
const generationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many generations. Please retry in a minute.' },
});

const validateGenerateLogs = [
  body('scenarioType')
    .exists()
    .withMessage('scenarioType is required')
    .bail()
    .isString()
    .withMessage('scenarioType must be a string')
    .bail()
    .trim()
    .customSanitizer((v) => String(v).toUpperCase())
    .isIn(SCENARIO_TYPES)
    .withMessage(`scenarioType must be one of: ${SCENARIO_TYPES.join(', ')}`),
  body('count')
    .optional()
    .isInt({ min: 10, max: 5000 })
    .withMessage('count must be an integer between 10 and 5000')
    .toInt(),
  body('autoIngest').optional().isBoolean().withMessage('autoIngest must be boolean').toBoolean(),
  body('timelineMinutes')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('timelineMinutes must be an integer between 1 and 120')
    .toInt(),
  body('outputDir').optional().isString().withMessage('outputDir must be a string').trim(),
  body('includeNoise').optional().isBoolean().withMessage('includeNoise must be boolean').toBoolean(),
  handleValidation,
];

const validateGenerateAndAnalyze = [
  body('scenarioType')
    .exists()
    .withMessage('scenarioType is required')
    .bail()
    .isString()
    .withMessage('scenarioType must be a string')
    .bail()
    .trim()
    .customSanitizer((v) => String(v).toUpperCase())
    .isIn(SCENARIO_TYPES)
    .withMessage(`scenarioType must be one of: ${SCENARIO_TYPES.join(', ')}`),
  body('count')
    .optional()
    .isInt({ min: 10, max: 5000 })
    .withMessage('count must be an integer between 10 and 5000')
    .toInt(),
  body('timelineMinutes')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('timelineMinutes must be an integer between 1 and 120')
    .toInt(),
  body('outputDir').optional().isString().withMessage('outputDir must be a string').trim(),
  body('includeNoise').optional().isBoolean().withMessage('includeNoise must be boolean').toBoolean(),
  handleValidation,
];

const validateDeleteGenerated = [
  param('filename')
    .exists()
    .withMessage('filename is required')
    .bail()
    .isString()
    .withMessage('filename must be a string')
    .bail()
    .custom((v) => {
      const name = String(v);
      const allowed =
        /^auth-\d{8}-\d{6}\.log$/.test(name) ||
        /^access-\d{8}-\d{6}\.log$/.test(name) ||
        name === 'scenario-metadata.json';
      if (!allowed) {
        throw new Error('filename must be a generated auth/access log or scenario-metadata.json');
      }
      return true;
    }),
  handleValidation,
];

function canDeleteGenerated(req) {
  // If API_KEY is set, apiKeyAuth already enforces it globally.
  if (process.env.API_KEY) return true;

  // Extra safety: if API key auth is disabled, require an explicit opt-in.
  if (String(process.env.ALLOW_UNAUTH_GENERATED_DELETE || '').toLowerCase() === 'true') {
    return true;
  }

  const expected = process.env.DELETE_TOKEN;
  if (expected && req.header('x-delete-token') === expected) {
    return true;
  }

  return false;
}

async function generateLogs(req, res, next) {
  try {
    const { scenarioType, count, autoIngest, timelineMinutes, outputDir, includeNoise } = req.body;

    logInfo('generateLogs start', {
      scenarioType,
      autoIngest: Boolean(autoIngest),
      ip: req.ip,
    });

    const options = {
      count,
      timelineMinutes,
      outputDir,
      includeNoise,
    };

    if (autoIngest) {
      const result = await generateAndAnalyze(scenarioType, options);
      logInfo('generateLogs done (autoIngest)', {
        scenarioType: result.scenarioType,
        totalLogs: result.counts?.totalLogs,
        incidentsDetected: result.analysis?.incidentsDetected,
      });

      return res.status(200).json({
        success: true,
        files: result.metadata?.files,
        metadata: result.metadata,
        analysis: result.analysis,
      });
    }

    const result = await generateLogsFromScenario(scenarioType, options);
    logInfo('generateLogs done', {
      scenarioType: result.scenarioType,
      totalLogs: result.counts?.totalLogs,
    });

    return res.status(200).json({
      success: true,
      files: result.metadata?.files,
      metadata: result.metadata,
    });
  } catch (err) {
    logError('generateLogs failed', { message: err?.message });

    // Service throws for invalid scenario types / outputDir.
    if (err && typeof err.message === 'string' && err.message.startsWith('Unknown scenarioType')) {
      return res.status(400).json({ error: err.message });
    }

    return next(err);
  }
}

async function generateAndAnalyzeHandler(req, res, next) {
  try {
    const { scenarioType, count, timelineMinutes, outputDir, includeNoise } = req.body;

    logInfo('generateAndAnalyze start', { scenarioType, ip: req.ip });

    const result = await generateAndAnalyze(scenarioType, {
      count,
      timelineMinutes,
      outputDir,
      includeNoise,
    });

    logInfo('generateAndAnalyze done', {
      scenarioType: result.scenarioType,
      incidentsDetected: result.analysis?.incidentsDetected,
    });

    return res.status(200).json({
      success: true,
      files: result.metadata?.files,
      metadata: result.metadata,
      incidents: result.analysis?.incidents || [],
      analysis: {
        parsedCount: result.analysis?.parsedCount ?? 0,
        storedCount: result.analysis?.storedCount ?? 0,
        incidentsDetected: result.analysis?.incidentsDetected ?? 0,
        incidentsStored: result.analysis?.incidentsStored ?? 0,
      },
    });
  } catch (err) {
    logError('generateAndAnalyze failed', { message: err?.message });

    if (err && typeof err.message === 'string' && err.message.startsWith('Unknown scenarioType')) {
      return res.status(400).json({ error: err.message });
    }

    return next(err);
  }
}

async function getScenarios(req, res, next) {
  try {
    return res.status(200).json({
      scenarios: listAvailableScenarios(),
      supportedOptions: {
        scenarioType: SCENARIO_TYPES,
        count: { min: 10, max: 5000 },
        timelineMinutes: { min: 1, max: 120 },
        autoIngest: true,
        includeNoise: true,
        outputDir: 'Path under backend/ (optional)',
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getGeneratedFiles(req, res, next) {
  try {
    const result = await getGeneratedLogFiles({ outputDir: req.query?.outputDir });
    return res.status(200).json({
      files: result.files || [],
      metadata: result.scenarioMetadata || null,
    });
  } catch (err) {
    return next(err);
  }
}

async function deleteGenerated(req, res, next) {
  try {
    if (!canDeleteGenerated(req)) {
      logWarn('deleteGenerated denied', { ip: req.ip });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const filename = req.params.filename;
    await deleteGeneratedLogFile(filename, { outputDir: req.query?.outputDir });

    logInfo('deleteGenerated ok', { filename });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  generationRateLimiter,
  validateGenerateLogs,
  validateGenerateAndAnalyze,
  validateDeleteGenerated,
  generateLogs,
  generateAndAnalyze: generateAndAnalyzeHandler,
  getScenarios,
  getGeneratedFiles,
  deleteGenerated,
};
