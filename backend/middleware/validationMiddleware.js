const { body, param, query, validationResult } = require('express-validator');

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('pageSize must be between 1 and 200')
    .toInt(),
];

const validateIncidentFilters = [
  query('status').optional().isString().trim().escape(),
  query('severity').optional().isString().trim().escape(),
];

const validateIncidentIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),
];

const validateIncidentStatusBody = [
  body('status')
    .isIn(['OPEN', 'ACKNOWLEDGED', 'CLOSED'])
    .withMessage('status must be one of OPEN, ACKNOWLEDGED, CLOSED'),
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return next();
}

module.exports = {
  validatePagination,
  validateIncidentFilters,
  validateIncidentIdParam,
  validateIncidentStatusBody,
  handleValidation,
};
