const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  powerMonitor,
  dialog,
} = require('electron');
const store = require('electron-settings');
const path = require('path');
const { GlobalKeyboardListener } = require('node-global-key-listener');
const moment = require('moment');
const fs = require('fs');
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
let currentSessionId = null;
const {db,setCurrentSessionId,createSession, getLastSession, updateSessionEndTime, updateSessionDetails, retainLastNSessions, saveGeoLocation, saveScreenshotRecord, saveStatsDb} = require('./db')
function setAuth(value) {
  const stmt = db.prepare(`
    INSERT INTO auth (authToken)
    VALUES (?)
    ON CONFLICT(authToken) DO UPDATE SET authToken = excluded.authToken
  `);
  const storedValue = typeof value === 'string' ? value : JSON.stringify(value);
  stmt.run(storedValue);
}
function setOwnerProject(ownerId) {
  if (ownerId == null) {
    return;
  }
  const stmt = db.prepare(`
    INSERT INTO Owner (ownerId)
    VALUES (?)
    ON CONFLICT(ownerId) DO UPDATE SET ownerId = excluded.ownerId
  `);
  stmt.run(ownerId);
}

ipcMain.on('send-session-details', async (event, data) => {
  try {
    await updateSessionDetails(data);
  } catch (err) {
    console.error('Error updating session details:', err);
  }
});
ipcMain.on('set-user-data', async (event, data) => {
  try {
    authToken = data.authToken;
    if (authToken) {
      await store.set('authToken', authToken);
      console.log("setting authToken to:",authToken);
      setAuth(authToken);
      await fetchCaptureInterval();
    }
  } catch (error) {
    console.error('Failed to set user data:', error);
    event.reply('set-user-data-error', {
      success: false,
      error: error.message,
    });
  }
});

ipcMain.handle('set-activity-data', async (event, data) => {
  try {
    ownerId = data.ownerId;
    await store.set('ownerId', ownerId);
    console.log("setting ownerId to:",ownerId);
    setOwnerProject(ownerId);
    return { success: true };
  } catch (error) {
    console.error('Failed to set activity data:', error);
    return { success: false, error: error.message };
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

// ipcMain.on('fetch-activity-report-interval', async (event) => {
//   event.sender.send('activity-report-interval', activityReportInterval);
// });

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

    // 4) Report Iinterval
    // activityReportInterval =
    //   response?.data?.data?.activityReportIntervalInSeconds;

    if (mainWindow) {
      mainWindow.webContents.send(
        'capture-interval',
        captureIntervalMinutes?.toFixed(1) || 5
      );
      mainWindow.webContents.send(
        'acitivity-interval',
        activityIntervalMinutes || 1
      );
      mainWindow.webContents.send(
        'activity-speed-location-interval',
        +activitySpeedLocationInterval || 2000
      );
      // mainWindow.webContents.send(
      //   'activity-report-interval',
      //   +activityReportInterval || 900
      // );
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

  const storeToken = await store.get('authToken');

  if (storeToken) {
    authToken = storeToken;
    await fetchCaptureInterval();
    await loadStats();
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
  if (currentSessionId) {
    saveStatsDb(
      clickCount,
      scrollCount,
      keyCount,
      accumulatedText,
      appWebsites,
      appWebsiteDetails
    );
  }
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

// Function to capture and save screenshot
async function captureAndSaveScreenshot() {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    const primaryDisplay = sources[0];

    if (primaryDisplay) {
      const screenshotBuffer = primaryDisplay.thumbnail.toPNG();
      const fileName = `Screenshot_${moment().format('YYYY-MM-DD_HH-mm-ss')}.png`;

      // Save locally
      const screenshotsDir = path.join(__dirname, 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
      }

      const filePath = path.join(screenshotsDir, fileName);
      fs.writeFileSync(filePath, screenshotBuffer);

      // Save record to DB
      if (currentSessionId) {
        saveScreenshotRecord(fileName, filePath);
      }

      // Upload logic (your existing code)
      const screenshotBlob = new Blob([screenshotBuffer], { type: 'image/png' });
      const file = new File([screenshotBlob], fileName, { type: 'image/png' });

      const formData = new FormData();
      formData.append('files', file);

      authToken = authToken || (await store.get('authToken'));
      ownerId = ownerId || (await store.get('ownerId'));

      if (!ownerId || !authToken) {
        throw new Error('ownerId or authToken not set');
      }

      formData.append('ownerId', ownerId);

      const response = await axios.post(
        `${API_BASE_URL}/employee/media/add`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const mediaId = await response?.data?.data?.[0]?.id;

      const payload = {
        ownerId,
        mediaId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      await axios.post(
        `${API_BASE_URL}/employee/v2/project/project/task/activity/screenshot/add`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
    }
  } catch (error) {
    console.error('Error capturing or uploading screenshot:', error);
  }
}
// Function to start screenshot capture
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
  isLogging = true;
  clickCount = 0;
  scrollCount = 0;
  keyCount = 0;
  accumulatedText = '';
  lastActivityTime = Date.now();
  lastActiveWindow = null;
  appWebsites = [];
  appWebsiteDetails = [];

  const sessionId = createSession();
  currentSessionId=sessionId;
  console.log('aagai value main me, ab dalenge set me [sessionId]:', sessionId);
  console.log('currentSessionId:',currentSessionId);
  setCurrentSessionId(sessionId);
  await startScreenshotCapture();
});

ipcMain.handle('restart-logging', async () => {
  authToken = await store.get('authToken');
  ownerId = await store.get('ownerId');
  const savedStats = await store.get('stats');

  isLogging = true;
  clickCount = savedStats.clickCount;
  scrollCount = savedStats.scrollCount || 0;
  keyCount = savedStats.keyCount;
  accumulatedText = savedStats.accumulatedText;
  lastActivityTime = Date.now();
  lastActiveWindow = await getActiveWindowInfo();
  appWebsites = savedStats.appWebsites;
  appWebsiteDetails = savedStats.appWebsiteDetails;

  // const sessionId = getLastSession(); // <- use local var
  // currentSessionId=sessionId;
  // console.log('RESTART->aagai value main me, ab dalenge set me [sessionId]:', sessionId);
  console.log('RESTART->currentSessionId:',currentSessionId);
  setCurrentSessionId(currentSessionId);     // <- update db.js
  await startScreenshotCapture();
});

ipcMain.handle('clear-store-stats', async () => {
  await store.set('stats', initialStats);
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
    saveGeoLocation(location);
  } catch (error) {
    console.error('Failed to fetch location:', error.message);
  }

  return location;
});

ipcMain.on('stop-logging', () => {
  isLogging = false;
  updateSessionEndTime(currentSessionId);
  currentSessionId=null;
  retainLastNSessions(5);
  stopScreenshotCapture();
  saveStatsDb(clickCount,scrollCount,keyCount,accumulatedText,appWebsites,appWebsiteDetails);
  stats = initialStats;
  store.reset('stats');
});

ipcMain.handle('get-initial-stats', async () => {
  return stats;
});

function saveStats(stats) {
  store.set('stats', stats);
}

async function loadStats() {
  const savedStats = await store.get('stats');
  if (savedStats) {
    stats = savedStats;
    clickCount = stats.clickCount;
    scrollCount = stats.scrollCount || 0;
    keyCount = stats.keyCount;
    accumulatedText = stats.accumulatedText;
    lastActivityTime = Date.now();
    appWebsites = stats.appWebsites;
    appWebsiteDetails = stats.appWebsiteDetails;
  } else {
    stats = initialStats;
  }
}

async function clearRendererStorage() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      await mainWindow.webContents.session.clearStorageData({
        storages: ['localStorage'],
      });
      await store.reset();
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
