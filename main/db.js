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

db.prepare(`
    CREATE TABLE IF NOT EXISTS auth (
        authToken Text Primary Key
    )    
`).run();

db.prepare(`
    CREATE TABLE IF NOT EXISTS OwnerProject(
        ownerId TEXT Primary Key,
        projectTaskActivityId TEXT
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

function setCurrentSessionId(sessionId){
    currentSessionId = sessionId;
}
function createSession(){
    const sessionId = `session_${moment().format('YYYYMMDD_HHmmss')}`;
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
    if (!currentSessionId) {
    // console.error('No active session ID found.');
    // return;
    currentSessionId=getLastSession();
    console.log('session id was null and function was used to fill it again');
  }

  const query = `
    UPDATE sessions
    SET Project = ?, Task = ?, Description = ?
    WHERE id = ?
  `;

  try {
    const stmt = db.prepare(query);
    const info = stmt.run(projectName, projectTaskName, description, currentSessionId);
    console.log(`Updated session #${currentSessionId} successfully. Rows affected: ${info.changes}`);
  } catch (err) {
    console.error('Failed to update session details:', err.message);
  }
}
function retainLastNSessions(n = 5) {
  const toDelete = db.prepare(
    'SELECT id FROM sessions ORDER BY StartTime DESC LIMIT -1 OFFSET ?'
  ).all(n);
  if (toDelete.length) {
    const ids = toDelete.map(r => r.id);
    db.prepare(`DELETE FROM sessions WHERE id IN (${ids.map(() => '?').join(',')})`).run(...ids);
  }
}
module.exports = {
    db,
    setCurrentSessionId,
    createSession,
    getLastSession,
    updateSessionEndTime,
    updateSessionDetails,
    retainLastNSessions
};