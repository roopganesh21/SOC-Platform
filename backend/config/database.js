const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'soc.sqlite');

// Initialize a shared database connection
const db = new Database(dbPath);

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
      explanation TEXT NOT NULL,
      model TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_explanations_incident_id ON ai_explanations(incident_id);
    CREATE INDEX IF NOT EXISTS idx_ai_explanations_created_at ON ai_explanations(created_at);
  `);
}

module.exports = {
  db,
  migrate,
};
