const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'wedding.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency & reliability
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  console.warn('Note: Could not set PRAGMA:', e.message);
}

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_milestone INTEGER DEFAULT 0,
    status TEXT DEFAULT 'todo',
    progress INTEGER DEFAULT 0,
    assignee TEXT DEFAULT 'both',
    priority TEXT DEFAULT 'medium',
    estimated_cost REAL DEFAULT 0,
    actual_cost REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    checklist TEXT DEFAULT '[]',
    dependencies TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    created_by TEXT DEFAULT 'Alex',
    updated_by TEXT DEFAULT 'Alex',
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    created_at INTEGER,
    expires_at INTEGER
  );
`);

// Helpers for settings
function getSetting(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function setSetting(key, value) {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  stmt.run(key, String(value));
}

function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const result = {};
  for (const r of rows) {
    result[r.key] = r.value;
  }
  return result;
}

// Initialize default settings if not set
if (!getSetting('partner1_name')) {
  setSetting('partner1_name', 'Partner 1');
  setSetting('partner1_color', '#E06D85');
}
if (!getSetting('partner2_name')) {
  setSetting('partner2_name', 'Partner 2');
  setSetting('partner2_color', '#4A7C9D');
}
if (!getSetting('wedding_title')) {
  setSetting('wedding_title', 'Our Wedding');
}
if (!getSetting('wedding_date')) {
  // Default to ~9 months from today
  const target = new Date();
  target.setMonth(target.getMonth() + 9);
  setSetting('wedding_date', target.toISOString().split('T')[0]);
}
if (!getSetting('budget_total')) {
  setSetting('budget_total', '30000');
}

module.exports = {
  db,
  DB_PATH,
  getSetting,
  setSetting,
  getAllSettings
};
