const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'db', 'soc.sqlite');
const db = new Database(dbPath);

const tables = ['logs', 'incidents', 'ai_explanations'];

for (const t of tables) {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get();
    console.log(`${t}:`, row.c);
  } catch (e) {
    console.log(`${t}: N/A (table missing or error) - ${e.message}`);
  }
}
