const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const axios = require('axios');
const moment = require('moment');
const dbPath = path.join(__dirname, 'db.sqlite');
const dbDir = path.dirname(dbPath);

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

let currentSessionId = null;
let currProject = null;
let currTask = null;
let currDesc = null;
let lat = null;
let long = null;
let c = null;
db.prepare(`
    CREATE TABLE IF NOT EXISTS auth (
        authToken Text Primary Key
    )    
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS Owner(
        ownerId TEXT Primary Key
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT Primary Key,
        StartTime Datetime Default (datetime('now','localtime')),
        EndTime Datetime Default (datetime('now','localtime')),
        EmployeesTimezone TEXT,
        Project TEXT,
        Task TEXT,
        Description TEXT
    )
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS stats (
        sessionId TEXT primary key,
        clickCount INTEGER,
        scrollCount INTEGER,
        keyCount INTEGER,
        accumulatedText TEXT,
        appWebsites TEXT,
        appWebsiteDetails TEXT,
        FOREIGN KEY(sessionId) REFERENCES sessions(id) ON DELETE CASCADE
    )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS geoLocations (
    sessionId TEXT primary key,
    latitude REAL,
    longitude REAL,
    city TEXT,
    fetchedAt DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(sessionId) REFERENCES sessions(id) ON DELETE CASCADE
  )
`).run();
db.prepare(`
  CREATE TABLE IF NOT EXISTS screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sessionId TEXT,
    fileName TEXT,
    filePath TEXT,
    takenAt DATETIME DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY(sessionId) REFERENCES sessions(id) ON DELETE CASCADE
  )
`).run();
function setCurrentSessionId(sessionId) {
  currentSessionId = sessionId;
  console.log('Set krr di value db.js me:', currentSessionId);

  // Update session project/task/description
  const sessionQuery = `
    UPDATE sessions
    SET Project = ?, Task = ?, Description = ?
    WHERE id = ?
  `;

  try {
    const sessionStmt = db.prepare(sessionQuery);
    const info = sessionStmt.run(currProject, currTask, currDesc, currentSessionId);
    console.log(`Updated session #${currentSessionId} successfully. Rows affected: ${info.changes}`);
  } catch (err) {
    console.error('Failed to update session details:', err.message);
  }

  // Insert geolocation if values are provided
  if (lat && long && c) {
    try {
      const geoStmt = db.prepare(`
        INSERT INTO geoLocations (sessionId, latitude, longitude, city)
        VALUES (?, ?, ?, ?)
      `);
      geoStmt.run(currentSessionId, lat, long, c);
      console.log(`Inserted geolocation for session #${currentSessionId}: ${lat}, ${long}, ${c}`);
    } catch (geoErr) {
      console.error('Failed to save geo-location:', geoErr.message);
    }
  }
}
function createSession(){
    const sessionId = `session_${moment().format('YYYYMMDD_HHmmss_SSS')}`;
    const startTime = moment().format('YYYY-MM-DD HH:mm:ss')
    db.prepare(`
        INSERT INTO sessions (id, StartTime)
        VALUES (?, ?)
  `).run(sessionId, startTime);
  console.log('session id is:',sessionId);
  return sessionId;
}
function getLastSession() {
  const stmt = db.prepare(`
    SELECT * FROM sessions
    ORDER BY StartTime DESC
    LIMIT 1
  `);
  const result = stmt.get();
  return result?.id || null;
}
function updateSessionEndTime(sessionId) {
  const endTime = moment().format('YYYY-MM-DD HH:mm:ss');
  db.prepare(`
    UPDATE sessions
    SET EndTime = ?
    WHERE id = ?
  `).run(endTime, sessionId);
}
function updateSessionDetails({ projectName, projectTaskName, description }) {
  console.log('updating details at session id:',currentSessionId);
  console.log('updating details at project:',projectName);
  currProject=projectName;
  console.log('updating details at task:',projectTaskName);
  currTask=projectTaskName;
  console.log('updating details at description:',description);
  currDesc=description;
}
function retainLastNSessions(n = 5) {
  const toDelete = db.prepare(
    `SELECT id FROM sessions ORDER BY StartTime ASC LIMIT (
      SELECT COUNT(*) FROM sessions
    ) - ?`
  ).all(n);

  if (toDelete.length) {
    const ids = toDelete.map(r => r.id);
    db.prepare(`DELETE FROM sessions WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
    console.log(`Deleted ${ids.length} old session(s).`);
  } else {
    console.log('No old sessions to delete.');
  }
}
function saveGeoLocation({ latitude, longitude, city }) {
  lat=latitude;
  long=longitude;
  c=city;
  console.log('city:',city);
  console.log('c:',c);
}
function saveScreenshotRecord(fileName, filePath) {
  const stmt = db.prepare(`
    INSERT INTO screenshots (sessionId, fileName, filePath)
    VALUES (?, ?, ?)
  `);
  stmt.run(currentSessionId, fileName, filePath);
}
function saveStatsDb(clickCount, scrollCount, keyCount, accumulatedText, appWebsites, appWebsiteDetails) {
  const stmt = db.prepare(`
    INSERT INTO stats (
      sessionId,
      clickCount,
      scrollCount,
      keyCount,
      accumulatedText,
      appWebsites,
      appWebsiteDetails
    ) VALUES (
      @sessionId,
      @clickCount,
      @scrollCount,
      @keyCount,
      @accumulatedText,
      @appWebsites,
      @appWebsiteDetails
    )
    ON CONFLICT(sessionId) DO UPDATE SET
      clickCount = excluded.clickCount,
      scrollCount = excluded.scrollCount,
      keyCount = excluded.keyCount,
      accumulatedText = excluded.accumulatedText,
      appWebsites = excluded.appWebsites,
      appWebsiteDetails = excluded.appWebsiteDetails
  `);

  stmt.run({
    sessionId: currentSessionId,
    clickCount,
    scrollCount,
    keyCount,
    accumulatedText,
    appWebsites: JSON.stringify(appWebsites),
    appWebsiteDetails: JSON.stringify(appWebsiteDetails),
  });
}

module.exports = {
    db,
    setCurrentSessionId,
    createSession,
    getLastSession,
    updateSessionEndTime,
    updateSessionDetails,
    retainLastNSessions,
    saveGeoLocation,
    saveScreenshotRecord,
    saveStatsDb
};
