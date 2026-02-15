const { db } = require('../config/database');

function getTableColumns(tableName) {
  try {
    return db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all()
      .map((c) => c.name);
  } catch (err) {
    return [];
  }
}

// Logs -----------------------------------------------------------------------

const insertLogStmt = db.prepare(
  'INSERT INTO logs (source, timestamp, severity, category, message, raw) VALUES (@source, @timestamp, @severity, @category, @message, @raw)'
);

const bulkInsertTransaction = db.transaction((rows) => {
  for (const row of rows) {
    insertLogStmt.run(row);
  }
});

function insertLogEntry(entry) {
  return insertLogStmt.run(entry);
}

function bulkInsertLogs(entries) {
  if (!entries || entries.length === 0) return { changes: 0 };
  bulkInsertTransaction(entries);
  return { changes: entries.length };
}

function getLogsByDateRange(fromIso, toIso) {
  const stmt = db.prepare(
    'SELECT * FROM logs WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC'
  );
  return stmt.all(fromIso, toIso);
}

function getLogsByIp(ip) {
  const stmt = db.prepare('SELECT * FROM logs WHERE raw LIKE ? ORDER BY timestamp ASC');
  return stmt.all(`%${ip}%`);
}

function getLogsByUser(user) {
  const stmt = db.prepare('SELECT * FROM logs WHERE raw LIKE ? ORDER BY timestamp ASC');
  return stmt.all(`%${user}%`);
}

// Incidents ------------------------------------------------------------------

function getIncidents({ page, pageSize, status, severity }) {
  const limit = pageSize;
  const offset = (page - 1) * pageSize;

  let baseQuery = 'FROM incidents WHERE 1=1';
  const params = [];

  if (status) {
    // Allow case-insensitive filtering (UI uses uppercase, DB may store title-case)
    baseQuery += ' AND status = ? COLLATE NOCASE';
    params.push(status);
  }

  if (severity) {
    // Allow case-insensitive filtering (UI uses uppercase, DB may store title-case)
    baseQuery += ' AND severity = ? COLLATE NOCASE';
    params.push(severity);
  }

  const rows = db
    .prepare(`SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  const total = db
    .prepare(`SELECT COUNT(*) as count ${baseQuery}`)
    .get(...params).count;

  return {
    items: rows,
    page,
    pageSize,
    total,
  };
}

function getIncidentById(id) {
  const stmt = db.prepare('SELECT * FROM incidents WHERE id = ?');
  return stmt.get(id);
}

const insertIncidentStmt = db.prepare(
  'INSERT INTO incidents (title, description, status, severity, created_at, updated_at) VALUES (@title, @description, @status, @severity, @created_at, @updated_at)'
);

const bulkInsertIncidentsTransaction = db.transaction((rows) => {
  for (const row of rows) {
    insertIncidentStmt.run(row);
  }
});

function insertIncident(row) {
  return insertIncidentStmt.run(row);
}

function bulkInsertIncidents(rows) {
  if (!rows || rows.length === 0) return { changes: 0 };
  bulkInsertIncidentsTransaction(rows);
  return { changes: rows.length };
}

function updateIncidentStatus(id, status) {
  const stmt = db.prepare(
    'UPDATE incidents SET status = ?, updated_at = ? WHERE id = ?'
  );
  const now = new Date().toISOString();
  return stmt.run(status, now, id);
}

function getIncidentStats() {
  const bySeverity = db
    .prepare('SELECT severity, COUNT(*) as count FROM incidents GROUP BY severity')
    .all();
  const byStatus = db
    .prepare('SELECT status, COUNT(*) as count FROM incidents GROUP BY status')
    .all();

  return {
    total: byStatus.reduce((sum, row) => sum + row.count, 0),
    bySeverity,
    byStatus,
  };
}

function getIncidentTrendsDaily(days = 30) {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const stmt = db.prepare(
    "SELECT DATE(created_at) as date, COUNT(*) as count FROM incidents WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY DATE(created_at) ASC"
  );
  return stmt.all(from);
}

function getTopIpsFromLogs(limit = 10) {
  const rows = db
    .prepare("SELECT message FROM logs WHERE message LIKE '%ip=%'")
    .all();

  const counts = new Map();

  for (const row of rows) {
    const match = row.message && row.message.match(/ip=([^\s]+)/);
    if (match && match[1]) {
      const ip = match[1];
      counts.set(ip, (counts.get(ip) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([ip, count]) => ({ ip, count }));
}

function getTopUsersFromLogs(limit = 10) {
  const rows = db
    .prepare("SELECT message FROM logs WHERE message LIKE '%user=%'")
    .all();

  const counts = new Map();

  for (const row of rows) {
    const match = row.message && row.message.match(/user=([^\s]+)/);
    if (match && match[1]) {
      const user = match[1];
      counts.set(user, (counts.get(user) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([user, count]) => ({ user, count }));
}

function getSeverityDistribution() {
  const stats = getIncidentStats();
  const total = stats.total || 0;

  if (total === 0) {
    return [];
  }

  return stats.bySeverity.map((row) => ({
    severity: row.severity || 'UNKNOWN',
    count: row.count,
    percentage: Number(((row.count / total) * 100).toFixed(2)),
  }));
}

// AI Explanations ------------------------------------------------------------

let aiExplanationInsertStmt = null;
let aiExplanationGetStmt = null;
let aiExplanationColumns = null;

function initAiExplanationStatements() {
  if (aiExplanationColumns && aiExplanationInsertStmt && aiExplanationGetStmt) {
    return;
  }

  aiExplanationColumns = getTableColumns('ai_explanations');
  const has = (name) => aiExplanationColumns.includes(name);

  const insertCols = ['incident_id'];
  const placeholders = ['@incident_id'];

  // Legacy schema (older DBs): explanation (NOT NULL), created_at (NOT NULL), model
  if (has('explanation')) {
    insertCols.push('explanation');
    placeholders.push('@explanation');
  }
  if (has('created_at')) {
    insertCols.push('created_at');
    placeholders.push('@created_at');
  }
  if (has('model')) {
    insertCols.push('model');
    placeholders.push('@model');
  }

  // Newer schema (structured columns)
  const optionalCols = [
    'summary',
    'business_impact',
    'technical_analysis',
    'recommended_actions',
    'severity_justification',
    'generated_at',
    'model_version',
  ];
  for (const col of optionalCols) {
    if (has(col)) {
      insertCols.push(col);
      placeholders.push(`@${col}`);
    }
  }

  aiExplanationInsertStmt = db.prepare(
    `INSERT INTO ai_explanations (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`
  );

  const orderCol = has('generated_at')
    ? 'generated_at'
    : has('created_at')
      ? 'created_at'
      : 'id';

  aiExplanationGetStmt = db.prepare(
    `SELECT * FROM ai_explanations WHERE incident_id = ? ORDER BY ${orderCol} DESC LIMIT 1`
  );
}

function insertAiExplanation(row) {
  initAiExplanationStatements();

  const has = (name) => aiExplanationColumns.includes(name);
  const nowIso = new Date().toISOString();

  const safeRow = { ...row };

  if (has('created_at') && !safeRow.created_at) {
    safeRow.created_at = safeRow.generated_at || nowIso;
  }

  if (has('model') && !safeRow.model) {
    // Keep legacy column populated for older schemas.
    safeRow.model = safeRow.model_version || 'gemini';
  }

  if (has('explanation') && !safeRow.explanation) {
    // Legacy schema expects a single NOT NULL `explanation` field.
    // Store the structured payload as JSON for backwards compatibility.
    safeRow.explanation = JSON.stringify(
      {
        summary: safeRow.summary || '',
        businessImpact: safeRow.business_impact || '',
        technicalAnalysis: safeRow.technical_analysis || '',
        recommendedActions: safeRow.recommended_actions
          ? (() => {
              try {
                const parsed = JSON.parse(safeRow.recommended_actions);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                return [];
              }
            })()
          : [],
        severityJustification: safeRow.severity_justification || '',
      },
      null,
      0
    );
  }

  return aiExplanationInsertStmt.run(safeRow);
}

function getExplanationByIncidentId(incidentId) {
  initAiExplanationStatements();

  const row = aiExplanationGetStmt.get(incidentId);
  if (!row) return null;

  let recommendedActions = [];
  if (row.recommended_actions) {
    try {
      const parsed = JSON.parse(row.recommended_actions);
      if (Array.isArray(parsed)) {
        recommendedActions = parsed;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse recommended_actions JSON from DB:', err);
    }
  }

  // If we are on a legacy schema that stores everything in `explanation`, try to parse it.
  if (!row.summary && row.explanation) {
    try {
      const parsed = JSON.parse(row.explanation);
      if (parsed && typeof parsed === 'object') {
        return {
          summary: parsed.summary || '',
          businessImpact: parsed.businessImpact || '',
          technicalAnalysis: parsed.technicalAnalysis || '',
          recommendedActions: Array.isArray(parsed.recommendedActions)
            ? parsed.recommendedActions
            : recommendedActions,
          severityJustification: parsed.severityJustification || '',
          generatedAt: row.generated_at || row.created_at || null,
          modelVersion: row.model_version || row.model || null,
        };
      }
    } catch (err) {
      // ignore
    }
  }

  return {
    summary: row.summary || '',
    businessImpact: row.business_impact || '',
    technicalAnalysis: row.technical_analysis || '',
    recommendedActions,
    severityJustification: row.severity_justification || '',
    generatedAt: row.generated_at || row.created_at || null,
    modelVersion: row.model_version || row.model || null,
  };
}

module.exports = {
  // Logs
  insertLogEntry,
  bulkInsertLogs,
  getLogsByDateRange,
  getLogsByIp,
  getLogsByUser,
  // Incidents
  getIncidents,
  getIncidentById,
  insertIncident,
  bulkInsertIncidents,
  updateIncidentStatus,
  getIncidentStats,
  getIncidentTrendsDaily,
  getTopIpsFromLogs,
  getTopUsersFromLogs,
  getSeverityDistribution,
  // AI explanations
  insertAiExplanation,
  getExplanationByIncidentId,
};
