const moment = require('moment');
const path = require('path');
const { app } = require('electron');
const dns = require('dns');
const axios = require('axios');

/**
 * Format a Date or timestamp string into 'YYYY-MM-DD HH:mm:ss'
 */
function formatTimestamp(date = new Date()) {
  return moment(date).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Format last active time as 'hh:mm:ss A' (e.g. 03:45:12 PM)
 */
function formatLastActive(time) {
  return moment(time).format('hh:mm:ss A');
}

/**
 * Set a config key-value pair in SQLite db
 */
function setConfig(db, key, value) {
  return db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
}

/**
 * Get a config value by key from SQLite db
 */
function getConfig(db, key) {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
  return row ? row.value : null;
}

/**
 * Get authorization headers for API calls
 */
function getAuthHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch configuration from API using token and base URL
 */
async function fetchConfig(apiBaseUrl, authToken) {
  const response = await axios.post(
    `${apiBaseUrl}/employee/auth/configuration/get`,
    {},
    { headers: getAuthHeaders(authToken) }
  );
  return response.data.data;
}

/**
 * Check internet connectivity by DNS lookup
 * Returns Promise<boolean>
 */
function checkInternetConnection() {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      resolve(!err);
    });
  });
}

/**
 * Generate screenshot filename like Screenshot_2025-05-22_14-30-01.png
 */
function getScreenshotFileName() {
  return `Screenshot_${moment().format('YYYY-MM-DD_HH-mm-ss')}.png`;
}

/**
 * Get full temp path for a screenshot file
 */
function getTempScreenshotPath() {
  return path.join(app.getPath('temp'), getScreenshotFileName());
}

module.exports = {
  formatTimestamp,
  formatLastActive,
  setConfig,
  getConfig,
  getAuthHeaders,
  fetchConfig,
  checkInternetConnection,
  getScreenshotFileName,
  getTempScreenshotPath,
};
