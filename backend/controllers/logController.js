const fs = require('fs');
const path = require('path');
const { parseAuthLog } = require('../services/logParser');
const { bulkInsertLogs } = require('../db/queries');

function mapEventTypeToSeverity(eventType) {
  switch (eventType) {
    case 'ACCEPTED_LOGIN':
      return 'INFO';
    case 'FAILED_LOGIN':
    case 'INVALID_USER':
      return 'WARN';
    case 'SUDO_VIOLATION':
      return 'ERROR';
    default:
      return 'INFO';
  }
}

async function uploadLogs(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, size, path: filePath, originalname, mimetype } = req.file;
    // Ensure the uploaded file is accessible
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (err) {
      return res.status(500).json({ error: 'Uploaded file not accessible' });
    }

    // Read file content
    const content = await fs.promises.readFile(filePath, 'utf8');

    // Parse auth.log-style content into structured events
    const parsedEvents = parseAuthLog(content);

    // Map parsed events to DB rows for the logs table
    const rows = parsedEvents.map((event) => {
      const severity = mapEventTypeToSeverity(event.eventType);
      const timestampIso = event.timestamp
        ? event.timestamp.toISOString()
        : new Date().toISOString();

      const messageParts = [];
      messageParts.push(event.eventType);
      if (event.user) messageParts.push(`user=${event.user}`);
      if (event.ip) messageParts.push(`ip=${event.ip}`);

      return {
        source: originalname,
        timestamp: timestampIso,
        severity,
        category: 'auth',
        message: messageParts.join(' '),
        raw: event.rawLog,
      };
    });

    // Bulk insert into SQLite
    const result = bulkInsertLogs(rows);

    return res.status(200).json({
      message: 'Log file uploaded, parsed, and stored successfully',
      file: {
        filename,
        originalname,
        mimetype,
        size,
        path: path.relative(process.cwd(), filePath),
      },
      stats: {
        parsedCount: parsedEvents.length,
        storedCount: result.changes || 0,
      },
      sample: parsedEvents.slice(0, 5),
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('File too large')) {
      return res.status(413).json({ error: 'File too large (max 10MB)' });
    }

    return next(err);
  }
}

module.exports = {
  uploadLogs,
};
