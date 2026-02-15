const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  generateLogs,
  generateAndAnalyze,
  getScenarios,
  getGeneratedFiles,
  deleteGenerated,
} = require('../controllers/logGenerationController');

const {
  validateGenerateRequest,
  validateFilename,
} = require('../middleware/logGenerationValidation');

const router = express.Router();

// 5 req/min (per IP) for generation endpoints
const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please retry in a minute.' },
});

// GET /api/logs/scenarios or /api/generate/scenarios
router.get('/scenarios', getScenarios);

// POST /api/logs/generate
router.post('/generate', generationLimiter, validateGenerateRequest, generateLogs);

// POST /api/logs/generate-and-analyze
router.post('/generate-and-analyze', generationLimiter, validateGenerateRequest, generateAndAnalyze);

// Aliases for Step 9D.5 Postman examples when mounted at /api/generate
// POST /api/generate/logs
router.post('/logs', generationLimiter, validateGenerateRequest, generateLogs);

// POST /api/generate/logs/analyze
router.post('/logs/analyze', generationLimiter, validateGenerateRequest, generateAndAnalyze);

// GET /api/logs/generated
router.get('/generated', getGeneratedFiles);

// DELETE /api/logs/generated/:filename
router.delete('/generated/:filename', generationLimiter, validateFilename, deleteGenerated);

module.exports = router;
