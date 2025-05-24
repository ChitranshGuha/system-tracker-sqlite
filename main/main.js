const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  powerMonitor,
  dialog,
} = require('electron');
// const store = require('electron-settings');
const { captureAndSaveScreenshot } = require('./screenshot');
const path = require('path');
const { GlobalKeyboardListener } = require('node-global-key-listener');
const moment = require('moment');

const { spawn } = require('child_process');

// API
const { default: axios } = require('axios');
const dns = require('dns');

const IS_PRODUCTION = false;
const API_BASE_URL = `https://webtracker${IS_PRODUCTION ? 'prod' : ''}.infoware.xyz/api`;

// Offline & Online
let isOffline = false;

// Electron Related
let mainWindow;

// Renderer Data
let isLogging = false;
let screenshotInterval;
let captureIntervalMinutes;
let activityIntervalMinutes;
let activitySpeedLocationInterval;
let isUploadingScreenshot = false;
// let activityReportInterval;

// Activities
let clickCount = 0;
let scrollCount = 0;
let keyCount = 0;
let accumulatedText = '';

// Last Activity time
let lastActivityTime = Date.now();

let ownerId = null;
let authToken = null;
let projectTaskActivityId = null;

// Active window tracking
let lastActiveWindow = null;
let appWebsites = [];
let appWebsiteDetails = [];

// Stats

let initialStats = {
  clickCount: 0,
  scrollCount: 0,
  keyCount: 0,
  accumulatedText: '',
  lastActive: '',
  appWebsites: [],
  appWebsiteDetails: [],
};

let stats = initialStats;

//for Database
const { db } = require('./db');
const fs = require('fs');
const FormData = require('form-data');
const { setCurrentSessionId } = require('./db');
const { createSession } = require('./db');
let currentSessionId=null;

async function initializeAppConfig() {
  global.appConfig = {
    authToken: await getConfig('authToken'),
    ownerId: await getConfig('ownerId'),
    projectTaskActivityId: await getConfig('projectTaskActivityId'),
  };
}
function setConfig(key, value) {
  const stmt = db.prepare(`
    INSERT INTO config (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  stmt.run(key, String(value));
}


function getConfig(key) {
  const row = db.prepare(`
    SELECT value
      FROM config
     WHERE key = ?
  `).get(key);

  if (!row) return null;

  // if you know some values are JSON, parse them, otherwise return raw string
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

ipcMain.on('set-user-data', async (event, data) => {
  try {
    if (data.authToken) {
      authToken = data.authToken;
      console.log('Setting AuthToken to:', authToken);
      setConfig('authToken', authToken);
    }
    
    if (data.ownerId) {
      ownerId = data.ownerId;
      console.log('Setting ownerId to:', ownerId);
      setConfig('ownerId', ownerId);
    }
    
    if (data.projectTaskActivityId) {
      projectTaskActivityId = data.projectTaskActivityId;
      console.log('Setting projectTaskActivityId to:', projectTaskActivityId);
      setConfig('projectTaskActivityId', projectTaskActivityId);
    }

    if (authToken && ownerId) {
      await fetchCaptureInterval();
    }
  } catch (err) {
    console.error('Failed to set user data:', err);
  }
});

ipcMain.handle('set-activity-data', async (_event, data) => {
  try {
    const insertStmt = db.prepare(`
      INSERT INTO stats (
        sessionId,
        clickCount,
        scrollCount,
        keyCount,
        accumulatedText,
        lastActive,
        appWebsites,
        appWebsiteDetails
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      data.sessionId,
      data.clickCount || 0,
      data.scrollCount || 0,
      data.keyCount || 0,
      data.accumulatedText || '',
      data.lastActive || '',
      JSON.stringify(data.appWebsites || []),
      JSON.stringify(data.appWebsiteDetails || [])
    );

    return { success: true };
  } catch (err) {
    console.error('Error inserting activity data into SQLite:', err);
    return { success: false, error: err.message };
  }
});
// Function to fetch capture interval from API
ipcMain.on('fetch-capture-interval', async (event) => {
  event.sender.send('capture-interval', captureIntervalMinutes);
});

// Function to fetch activity interval from API
ipcMain.on('fetch-activity-interval', async (event) => {
  event.sender.send('activity-interval', activityIntervalMinutes);
});

ipcMain.on('fetch-activity-speed-location-interval', async (event) => {
  event.sender.send(
    'activity-speed-location-interval',
    activitySpeedLocationInterval
  );
});

// Offline & Online - Logic

ipcMain.on('app-offline', () => {
  isOffline = true;

  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
  mainWindow.show();
});

ipcMain.on('exit-app', () => {
  app.quit();
});

powerMonitor.on('suspend', () => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('suspend');
  }
});

function checkInternetConnection() {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      if (err) {
        isOffline = true;
        resolve(false);
      } else {
        isOffline = false;
        resolve(true);
      }
    });
  });
}

function showOfflineDialog() {
  dialog.showErrorBox(
    'No Internet Connection 🔌',
    `This application requires an internet connection to track activities.\nPlease connect to the internet and try again.`
  );

  app.quit();
}

async function fetchCaptureInterval() {
  authToken = authToken || await getConfig('authToken');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/employee/auth/configuration/get`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // 1) Screenshot capture interval
    captureIntervalMinutes =
      response?.data?.data?.screenshotIntervalInSeconds / 60;

    // 2) Activity interval
    activityIntervalMinutes =
      response?.data?.data?.activityDetailIntervalInSeconds / 60;

    // 3) Speed location interval
    activitySpeedLocationInterval =
      response?.data?.data?.internetSpeedIntervalInSeconds;
      
    if (mainWindow) {
      mainWindow.webContents.send(
        'capture-interval',
        captureIntervalMinutes?.toFixed(1) || 5
      );
      mainWindow.webContents.send(
        'activity-interval',
        activityIntervalMinutes || 1
      );
      mainWindow.webContents.send(
        'activity-speed-location-interval',
        +activitySpeedLocationInterval || 2000
      );
     }
    return captureIntervalMinutes;
  } catch (error) {
    console.error('Error fetching capture interval:', error);
    return null;
  }
}

// Create main application window
async function createWindow() {
  const isOnline = await checkInternetConnection();

  if (!isOnline) {
    showOfflineDialog();
    return;
  }
  await initializeAppConfig();

  const isDev = await import('electron-is-dev').then(
    (module) => module.default
  );

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    simpleFullscreen: true,
    title: 'Activity Tracker - Digital Links',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../out/index.html')}`
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const storeToken = getConfig('authToken');

  if (storeToken) {
    authToken = storeToken;
    await fetchCaptureInterval();
    stats =  loadStats();
  }

  setTimeout(() => {
    mainWindow.webContents.send('update-stats', stats);
  }, 500);

  // if (isDev) {
  mainWindow.webContents.openDevTools();
  // }
}
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.on('ready', createWindow);
  app.on('window-all-closed', () => {
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
    }

    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    if (screenshotInterval) {
      clearInterval(screenshotInterval);
      screenshotInterval = null;
    }
  });

    app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
}
async function getActiveWindowInfo() {
  try {
    const { activeWindow } = await import('get-windows');
    const window = await activeWindow();
    if (window) {
      return {
        platform: window?.platform,
        name: window.owner.name,
        title: window.title,
        memoryUsage: window?.memoryUsage,
        time: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error('Error getting active window info:', error);
  }
  return null;
}
// Function to update and send stats
async function updateStats(isActivity = false) {
  const currentTime = Date.now();

  if (isActivity) {
    lastActivityTime = currentTime;
  }

  const activeWindow = await getActiveWindowInfo();

  if (
    activeWindow &&
    activeWindow.name?.toLowerCase().trim() !== 'electron' &&
    (lastActiveWindow === null ||
      activeWindow.name !== lastActiveWindow.name ||
      activeWindow.title !== lastActiveWindow.title)
  ) {
    if (
      lastActiveWindow === null ||
      !appWebsites?.includes(activeWindow?.name)
    ) {
      appWebsites?.unshift(activeWindow?.name);
    }
    appWebsiteDetails?.unshift(activeWindow);

    lastActiveWindow = activeWindow;
  }

  stats = {
    sessionId:currentSessionId,
    clickCount,
    scrollCount,
    keyCount,
    accumulatedText,
    lastActive: moment(lastActivityTime).format('hh:mm:ss A'),
    appWebsites,
    appWebsiteDetails,
  };

  mainWindow.webContents.send('update-stats', stats);
  saveStats(stats);
}
// Set up global keyboard listener
const keyboardListener = new GlobalKeyboardListener();
keyboardListener.addListener((e) => {
  if (!isOffline && isLogging && !mainWindow.isFocused()) {
    if (e.name === 'MOUSE LEFT' || e.name === 'MOUSE RIGHT') {
      if (e.state === 'UP') {
        clickCount++;
      }
    } else {
      if (e.state === 'DOWN') {
        keyCount++;
        accumulatedText +=
          e.name === 'SPACE'
            ? ' '
            : e.name.length === 1
              ? e.name?.toLowerCase()
              : '';
      }
    }

    updateStats(true);
  }
});
// Set up scroll events
async function getScrollTracker() {
  const isDev = await import('electron-is-dev').then(
    (module) => module.default
  );

  if (!isDev) {
    const executableExtension = process.platform === 'win32' ? '.exe' : '';
    pythonExecutablePath = path.join(
      process.resourcesPath,
      'resources',
      'dist',
      `scroll_tracker${executableExtension}`
    );

    const child = spawn(pythonExecutablePath);

    child.stdout.on('data', (data) => {
      const message = data.toString().trim();

      if (
        message === 'scrolled' &&
        !isOffline &&
        isLogging &&
        !mainWindow.isFocused()
      ) {
        scrollCount++;
        updateStats(true);
      }
    });

    child.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
  } else {
    const child = spawn('python', ['main/scroll_tracker.py']);

    child.stdout.on('data', (data) => {
      const message = data.toString().trim();

      if (
        message === 'scrolled' &&
        !isOffline &&
        isLogging &&
        !mainWindow.isFocused()
      ) {
        scrollCount++;
        updateStats(true);
      }
    });

    child.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    child.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
  }
}
getScrollTracker();
async function startScreenshotCapture() {
  if (screenshotInterval) {
    stopScreenshotCapture();
  }

  screenshotInterval = setInterval(
    captureAndSaveScreenshot,
    captureIntervalMinutes * 60 * 1000
  );
}

// Function to stop screenshot capture
function stopScreenshotCapture() {
  clearInterval(screenshotInterval);
}

// IPC handlers
ipcMain.handle('start-logging', async () => {
  currentSessionId = createSession();
  setCurrentSessionId(currentSessionId); 
  isLogging = true;
  clickCount = 0;
  scrollCount = 0;
  keyCount = 0;
  accumulatedText = '';
  lastActivityTime = Date.now();
  lastActiveWindow = null;
  appWebsites = [];
  appWebsiteDetails = [];
  await startScreenshotCapture();
});

const { getStatsBySessionId } = require('./db');
ipcMain.handle('restart-logging', async (event, sessionId) => {
  currentSessionId = sessionId;
  setCurrentSessionId(currentSessionId);

  authToken = await getConfig('authToken');
  ownerId = await getConfig('ownerId');
  projectTaskActivityId = await getConfig('projectTaskActivityId');

  const savedStats = getStatsBySessionId(sessionId);

  isLogging = true;
  clickCount = savedStats.clickCount;
  scrollCount = savedStats.scrollCount || 0;
  keyCount = savedStats.keyCount;
  accumulatedText = savedStats.accumulatedText;
  lastActivityTime = Date.now();
  lastActiveWindow = await getActiveWindowInfo();
  appWebsites = savedStats.appWebsites;
  appWebsiteDetails = savedStats.appWebsiteDetails;
  await startScreenshotCapture();
});
ipcMain.handle('clear-store-stats', (event, sessionId) => {
  const stmt = db.prepare(`
    UPDATE stats
    SET
      clickCount = 0,
      scrollCount = 0,
      keyCount = 0,
      accumulatedText = '',
      lastActive = ''
    WHERE sessionId = ?
  `);
  stmt.run(sessionId);
});
ipcMain.handle('get-location', async () => {
  let location = null;
  try {
    const response = await axios.get('http://ip-api.com/json/');
    location = {
      latitude: response.data.lat,
      longitude: response.data.lon,
      city: `${response.data.city}, ${response.data.country}`,
    };
  } catch (error) {
    console.error('Failed to fetch location:', error.message);
  }

  return location;
});
const { clearStats } = require('./db');

ipcMain.on('stop-logging', () => {
  isLogging = false;
  stopScreenshotCapture();
  stats = initialStats;
  clearStats();
});

ipcMain.handle('get-initial-stats', () => {
  const row = db.prepare(`
    SELECT * FROM stats
    ORDER BY timestamp DESC
    LIMIT 1
  `).get();

  if (!row) {
    return {
      clickCount: 0,
      scrollCount: 0,
      keyCount: 0,
      accumulatedText: '',
      lastActive: null,
      appWebsites: {},
      appWebsiteDetails: {}
    };
  }

  return {
    clickCount: row.clickCount,
    scrollCount: row.scrollCount,
    keyCount: row.keyCount,
    accumulatedText: row.accumulatedText,
    lastActive: row.lastActive,
    appWebsites: row.appWebsites ? JSON.parse(row.appWebsites) : {},
    appWebsiteDetails: row.appWebsiteDetails ? JSON.parse(row.appWebsiteDetails) : {}
  };
});
function saveStats(stats) {
  const sessionId = stats.sessionId || currentSessionId || 'unknown';
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stats (
      sessionId, clickCount, scrollCount, keyCount, accumulatedText, lastActive, appWebsites, appWebsiteDetails
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    stats.sessionId,
    stats.clickCount,
    stats.scrollCount,
    stats.keyCount,
    stats.accumulatedText,
    new Date().toISOString(),
    JSON.stringify(stats.appWebsites),
    JSON.stringify(stats.appWebsiteDetails)
  );
}
function loadStats() {
  const row = db.prepare(`
    SELECT * FROM stats
    ORDER BY timestamp DESC
    LIMIT 1
  `).get();

  if (!row) return initialStats;

  return {
    sessionId: row.sessionId,
    clickCount: row.clickCount,
    scrollCount: row.scrollCount,
    keyCount: row.keyCount,
    accumulatedText: row.accumulatedText,
    lastActive: row.lastActive,
    appWebsites: row.appWebsites ? JSON.parse(row.appWebsites) : [],
    appWebsiteDetails: row.appWebsiteDetails ? JSON.parse(row.appWebsiteDetails) : []
  };
}

async function clearRendererStorage() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      await mainWindow.webContents.session.clearStorageData({
        storages: ['localStorage'],
      });
      await clearRendererStorage();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

app.on('will-uninstall', async (event) => {
  event.preventDefault();
  try {
    await clearRendererStorage();
  } catch (error) {
    console.error('Error clearing renderer storage:', error);
  }
  event.continue();
});
