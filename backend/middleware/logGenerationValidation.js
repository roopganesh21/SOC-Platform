const { body, param, validationResult } = require('express-validator');

const { SCENARIO_TYPES } = require('../services/logGenerationService');

function sendValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    error: 'Validation failed',
    details: errors.array().map((e) => ({ field: e.param, message: e.msg })),
  });
}

const validateGenerateRequest = [
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
    .isInt({ min: 1, max: 1000 })
    .withMessage('count must be an integer between 1 and 1000')
    .toInt(),
  body('autoIngest')
    .optional()
    .isBoolean()
    .withMessage('autoIngest must be boolean')
    .toBoolean(),
  sendValidationErrors,
];

const validateFilename = [
  param('filename')
    .exists()
    .withMessage('filename is required')
    .bail()
    .isString()
    .withMessage('filename must be a string')
    .bail()
    .custom((v) => {
      const name = String(v);

      // No traversal / paths
      if (name.includes('..') || name.includes('/') || name.includes('\\')) {
        throw new Error('Invalid filename');
      }

      // Only alphanumeric, dash, underscore + .log
      if (!/^[A-Za-z0-9_-]+\.log$/.test(name)) {
        throw new Error('filename must be alphanumeric/dash/underscore and end with .log');
      }

      return true;
    }),
  sendValidationErrors,
];

module.exports = {
  validateGenerateRequest,
  validateFilename,
};
