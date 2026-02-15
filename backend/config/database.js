const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'soc.sqlite');

// Initialize a shared database connection
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read/write behaviour
try {
  db.pragma('journal_mode = WAL');
} catch (e) {
  // If WAL cannot be enabled (e.g., on read-only FS), continue with default mode.
}

function migrate() {
  // Logs table: raw security events
  db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT,
      timestamp TEXT NOT NULL,
      severity TEXT,
      category TEXT,
      message TEXT,
      raw TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_logs_severity ON logs(severity);
  `);

  // Incidents table: grouped alerts/incidents
  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      severity TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
    CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
    CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
  `);

  // AI explanations table: generated context for incidents/alerts
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_explanations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER NOT NULL,
      summary TEXT,
      business_impact TEXT,
      technical_analysis TEXT,
      recommended_actions TEXT,
      severity_justification TEXT,
      generated_at TEXT,
      model_version TEXT,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_explanations_incident_id ON ai_explanations(incident_id);
    CREATE INDEX IF NOT EXISTS idx_ai_explanations_created_at ON ai_explanations(generated_at);
  `);

  // Ensure new columns exist on older databases
  const existingColumns = db
    .prepare('PRAGMA table_info(ai_explanations)')
    .all()
    .map((c) => c.name);

  const requiredColumns = [
    { name: 'summary', type: 'TEXT' },
    { name: 'business_impact', type: 'TEXT' },
    { name: 'technical_analysis', type: 'TEXT' },
    { name: 'recommended_actions', type: 'TEXT' },
    { name: 'severity_justification', type: 'TEXT' },
    { name: 'generated_at', type: 'TEXT' },
    { name: 'model_version', type: 'TEXT' },
  ];

  for (const col of requiredColumns) {
    if (!existingColumns.includes(col.name)) {
      db.exec(`ALTER TABLE ai_explanations ADD COLUMN ${col.name} ${col.type}`);
    }
  }
}

module.exports = {
  db,
  migrate,
};
