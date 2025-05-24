const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'data.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

let currentSessionId = null;

function setCurrentSessionId(sessionId) {
  currentSessionId = sessionId;
}

// Create config table
db.prepare(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`).run();

// Create sessions table
db.prepare(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    startedAt DATETIME DEFAULT (datetime('now','localtime'))
  )
`).run();

// Create stats table
db.prepare(`
  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId TEXT,
    timestamp DATETIME DEFAULT (datetime('now','localtime')),
    clickCount INTEGER,
    scrollCount INTEGER,
    keyCount INTEGER,
    accumulatedText TEXT,
    lastActive TEXT,
    appWebsites TEXT,
    appWebsiteDetails TEXT,
    FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
  )
`).run();

// Create pending_screenshots table
db.prepare(`
  CREATE TABLE IF NOT EXISTS pending_screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId TEXT,
    filePath TEXT NOT NULL,
    timestamp DATETIME DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (sessionId) REFERENCES sessions(id) ON DELETE CASCADE
  )
`).run();

// Create a new session
function createSession() {
  const sessionId = `session_${Date.now()}`;
  db.prepare(`INSERT INTO sessions (id) VALUES (?)`).run(sessionId);
  return sessionId;
}

// Retain only the last N sessions
function retainLastNSessions(n = 5) {
  const sessionsToDelete = db.prepare(`
    SELECT id FROM sessions ORDER BY startedAt DESC LIMIT -1 OFFSET ?
  `).all(n);

  if (sessionsToDelete.length > 0) {
    const ids = sessionsToDelete.map(s => s.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM sessions WHERE id IN (${placeholders})`).run(...ids);
  }
}

// Log activity stats
function logActivityStats({
  clickCount = 0,
  scrollCount = 0,
  keyCount = 0,
  accumulatedText = '',
  lastActive = '',
  appWebsites = '',
  appWebsiteDetails = ''
}) {
  const stmt = db.prepare(`
    INSERT INTO stats (
      sessionId, clickCount, scrollCount, keyCount, accumulatedText,
      lastActive, appWebsites, appWebsiteDetails
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    currentSessionId,
    clickCount,
    scrollCount,
    keyCount,
    accumulatedText,
    lastActive,
    typeof appWebsites === 'string' ? appWebsites : JSON.stringify(appWebsites),
    typeof appWebsiteDetails === 'string' ? appWebsiteDetails : JSON.stringify(appWebsiteDetails)
  );
}

// Save a screenshot entry
function savePendingScreenshot(filePath) {
  const stmt = db.prepare(`
    INSERT INTO pending_screenshots (sessionId, filePath, timestamp)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(currentSessionId, filePath);
}

// Clear old stats
function clearStats() {
  retainLastNSessions(5);
}

// Retrieve latest stats for a session
function getStatsBySessionId(sessionId) {
  const row = db.prepare(`
    SELECT * FROM stats WHERE sessionId = ? ORDER BY timestamp DESC LIMIT 1
  `).get(sessionId);

  if (!row) {
    return {
      clickCount: 0,
      scrollCount: 0,
      keyCount: 0,
      accumulatedText: '',
      lastActive: null,
      appWebsites: [],
      appWebsiteDetails: []
    };
  }

  return {
    clickCount: row.clickCount || 0,
    scrollCount: row.scrollCount || 0,
    keyCount: row.keyCount || 0,
    accumulatedText: row.accumulatedText,
    lastActive: row.lastActive,
    appWebsites: row.appWebsites ? JSON.parse(row.appWebsites) : [],
    appWebsiteDetails: row.appWebsiteDetails ? JSON.parse(row.appWebsiteDetails) : []
  };
}

module.exports = {
  db,
  createSession,
  retainLastNSessions,
  logActivityStats,
  savePendingScreenshot,
  clearStats,
  setCurrentSessionId,
  getStatsBySessionId
};
