const { desktopCapturer } = require('electron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');
const dns = require('dns');
const { db, savePendingScreenshot } = require('./db');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const API_BASE_URL = `https://webtracker${IS_PRODUCTION ? 'prod' : ''}.infoware.xyz/api`;

let screenshotInterval = null;

// Helper to read config values from DB
function getConfig(key) {
  const row = db.prepare(`SELECT value FROM config WHERE key = ?`).get(key);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

function checkInternetConnection() {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      resolve(!err);
    });
  });
}

async function captureAndSaveScreenshot() {
  try {
    // Refresh config from DB each run
    const authToken = getConfig('authToken');
    const ownerId = getConfig('ownerId');
    const projectTaskActivityId = getConfig('projectTaskActivityId');

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    const primaryDisplay = sources[0];
    if (!primaryDisplay) throw new Error('No screen source found.');

    const buffer = primaryDisplay.thumbnail.toPNG();
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const fileName = `screenshot_${timestamp}.png`;
    const filePath = path.join(__dirname, 'screenshots', fileName);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    const isOnline = await checkInternetConnection();

    if (isOnline && authToken && ownerId) {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('files', fs.createReadStream(filePath));
      formData.append('ownerId', ownerId);

      const uploadRes = await axios.post(
        `${API_BASE_URL}/employee/media/add`,
        formData,
        { headers: { Authorization: `Bearer ${authToken}`, ...formData.getHeaders() } }
      );

      const mediaId = uploadRes?.data?.data?.[0]?.id;
      if (mediaId) {
        const payload = { ownerId, projectTaskActivityId, mediaId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        await axios.post(
          `${API_BASE_URL}/employee/project/project/task/activity/screenshot/add`,
          payload,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        fs.unlinkSync(filePath);
      }
    } else {
      console.log('isOnline Status:', isOnline);
      console.log('AuthToken:', authToken);
      console.log('OwnerId:', ownerId);
      savePendingScreenshot(filePath);
    }
  } catch (error) {
    console.error('Error capturing/uploading screenshot:', error);
  }
}

/**
 * Starts automatic screenshot capture based on the 'screenshotIntervalInSeconds' in config or defaults to 300s.
 */
function startScreenshotCapture() {
  // Clear existing interval (if any)
  if (screenshotInterval) clearInterval(screenshotInterval);

  // Read interval (in seconds) from config, fallback to 300
  const intervalSec = getConfig('screenshotIntervalInSeconds') || 300;
  const intervalMs = intervalSec * 1000;
  console.log(`Starting screenshot capture every ${intervalSec} seconds`);

  screenshotInterval = setInterval(captureAndSaveScreenshot, intervalMs);
}

/**
 * Stops automatic screenshot capture.
 */
function stopScreenshotCapture() {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
}

module.exports = { captureAndSaveScreenshot, startScreenshotCapture, stopScreenshotCapture };
