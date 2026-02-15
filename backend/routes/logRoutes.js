const express = require('express');
const { uploadLogFile } = require('../middleware/uploadMiddleware');
const { uploadLogs } = require('../controllers/logController');
const logGenerationRoutes = require('./logGenerationRoutes');

const router = express.Router();

// POST /api/logs/upload
router.post('/upload', (req, res, next) => {
  uploadLogFile(req, res, (err) => {
    if (err) {
      // Multer or validation error
      if (err.message === 'File too large') {
        return res.status(413).json({ error: 'File too large (max 10MB)' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    return uploadLogs(req, res, next);
  });
});

// Log generation routes (Phase 9D)
router.use('/', logGenerationRoutes);

module.exports = router;
