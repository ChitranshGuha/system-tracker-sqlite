const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  powerMonitor,
} = require('electron');

const sharp = require('sharp');
const store = require('electron-settings');
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

const DEFAULT_SCREENSHOT_TYPE = 'SCREENSHOT';
const DEFAULT_CAPTURE_INTERVAL = 10;
const DEFAULT_ACTIVITY_INTERVAL = 1;
const DEFAULT_ACTIVITY_SPEED_LOCATION_INTERVAL = 1800;
let screenshotType = DEFAULT_SCREENSHOT_TYPE;

let captureIntervalMinutes;
let activityIntervalMinutes;
let activitySpeedLocationInterval;

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

// Offline Database and syncing

const Database = require('better-sqlite3');
const db = new Database(path.join(app.getPath('userData'), 'data.db'));

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS offlineStats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ownerId TEXT,
    projectTaskActivityId TEXT,
    trackerVersion TEXT,
    ipAddress TEXT,
    appWebsites TEXT,
    mouseClick INTEGER,
    scroll INTEGER,
    keystroke INTEGER,
    keyPressed TEXT,
    appWebsiteDetails TEXT,
    intervalStartTime TEXT,
    intervalEndTime TEXT
  )
`
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS offlineScreenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    authToken TEXT,
    ownerId TEXT,
    screenshotTakenTime TEXT,
    fileName TEXT,
    screenshotBlob BLOB
  )
`
).run();

let shouldNotRemoveTimer = false;

ipcMain.handle('should-nots-remove-timer', async () => {
  return shouldNotRemoveTimer;
});

async function syncOfflineData() {
  const authToken = await store.get('authToken');

  // Sync offline stats
  const statsRows = db.prepare('SELECT * FROM offlineStats').all();

  if (statsRows && statsRows?.length > 0) {
    isSyncing = true;
    shouldNotRemoveTimer = true;

    const projectTaskActivityDetails = statsRows.map((row) => ({
      projectTaskActivityId: row.projectTaskActivityId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      mouseClick: row.mouseClick ?? 0,
      keystroke: row.keystroke ?? 0,
      keyPressed: row.keyPressed ?? '',
      scroll: row.scroll ?? 0,
      appWebsites: row.appWebsites ? JSON.parse(row.appWebsites) : [],
      appWebsiteDetails: row.appWebsiteDetails
        ? JSON.parse(row.appWebsiteDetails)
        : [],
      trackerVersion: row.trackerVersion,
      ipAddress: row.ipAddress ?? 'offline',
      startTime: row.intervalStartTime ?? '',
      endTime: row.intervalEndTime ?? '',
    }));

    const payload = {
      ownerId:
        ownerId || (await store.get('ownerId')) || statsRows?.[0]?.ownerId,
      projectTaskActivityDetails,
    };

    try {
      await axios.post(
        `${API_BASE_URL}/employee/v2/project/project/task/activity/detail/add/bulk`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Remove synced row
      statsRows.forEach((row) =>
        db.prepare('DELETE FROM offlineStats WHERE id = ?').run(row.id)
      );

      // Reset sequence if table is empty
      const statscount = db.prepare('SELECT COUNT(*) as count FROM offlineStats').get().count;
      if (statscount === 0) {
        db.prepare("DELETE FROM sqlite_sequence WHERE name='offlineStats'").run();
      }     
    } catch (err) {
      // Remove synced row
      console.error('Failed to sync stats row:', err);
    } finally {
      isSyncing = false;
    }
  }

  // Sync offline screenshots
  const screenshotRows = db.prepare('SELECT * FROM offlineScreenshots').all();

  if (screenshotRows && screenshotRows?.length > 0) {
    try {
      // 1. Prepare FormData with all files
      const formData = new FormData();
      screenshotRows.forEach((row) => {
        const blob = new Blob([row.screenshotBlob], { type: 'image/png' });
        const file = new File([blob], row.fileName, { type: 'image/png' });
        formData.append('files', file);
      });
      formData.append('ownerId', screenshotRows[0].ownerId);

      // 2. Upload all files in one request
      const uploadRes = await axios.post(
        `${API_BASE_URL}/employee/media/add`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // 3. Prepare screenshot payload with mediaId and createdAt using index match
      const mediaIds = uploadRes.data.data.map((item) => item.id);
      const screenshotPayload = {
        ownerId: String(
          ownerId ||
            (await store.get('ownerId')) ||
            screenshotRows?.[0]?.ownerId
        ),
        projectTaskActivityScreenshots: screenshotRows.map((row, idx) => ({
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          mediaId: mediaIds[idx],
          createdAt: new Date(row.screenshotTakenTime).toISOString(),
        })),
      };

      // 4. Bulk upload screenshot metadata
      await axios.post(
        `${API_BASE_URL}/employee/v2/project/project/task/activity/screenshot/add/bulk`,
        screenshotPayload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // 5. Delete synced screenshots from DB
      screenshotRows.forEach((row) => {
        db.prepare('DELETE FROM offlineScreenshots WHERE id = ?').run(row.id);
      });

      // Reset sequence if table is empty
      const statsCount = db.prepare('SELECT COUNT(*) as count FROM offlineScreenshots').get().count;
      if (statsCount === 0) {
        db.prepare("DELETE FROM sqlite_sequence WHERE name='offlineScreenshots'").run();
      }

    } catch (err) {
      console.error('Failed to sync screenshot rows:', err);
    }
  }
}

ipcMain.on('set-user-data', async (event, data) => {
  try {
    authToken = data.authToken;
    if (authToken) {
      await store.set('authToken', authToken);
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

    return { success: true };
  } catch (error) {
    console.error('Failed to set activity data:', error);
    return { success: false, error: error.message };
  }
});

// Function to fetch capture interval from API
ipcMain.on('fetch-capture-interval', async (event) => {
  event.sender.send(
    'capture-interval',
    captureIntervalMinutes || DEFAULT_CAPTURE_INTERVAL
  );
});

// Function to fetch activity interval from API
ipcMain.on('fetch-activity-interval', async (event) => {
  event.sender.send(
    'activity-interval',
    activityIntervalMinutes || DEFAULT_ACTIVITY_INTERVAL
  );
});

ipcMain.on('fetch-activity-speed-location-interval', async (event) => {
  event.sender.send(
    'activity-speed-location-interval',
    activitySpeedLocationInterval || DEFAULT_ACTIVITY_SPEED_LOCATION_INTERVAL
  );
});

// Offline & Online - Logic

ipcMain.on('app-offline', () => {
  isOffline = true;
});

ipcMain.on('app-online', async () => {
  isOffline = false;

  db.prepare(
    `
    UPDATE offlineStats
    SET intervalEndTime = ?
    WHERE intervalEndTime IS NULL OR intervalEndTime = ''
    ORDER BY id DESC LIMIT 1
  `
  ).run(new Date().toISOString());

  await syncOfflineData();
});

ipcMain.on('exit-app', () => {
  app.quit();
});

ipcMain.handle('offline-activity-data', async (event, data) => {
  if (isOffline) {
    db.prepare(
      `
      INSERT INTO offlineStats (
        ownerId,
        projectTaskActivityId,
        trackerVersion,
        ipAddress,
        appWebsites,
        mouseClick,
        scroll,
        keystroke,
        keyPressed,
        appWebsiteDetails,
        intervalStartTime,
        intervalEndTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      data.ownerId,
      data.projectTaskActivityId,
      data.trackerVersion,
      data.ipAddress,
      JSON.stringify(data.appWebsites),
      data.mouseClick,
      data.scroll,
      data.keystroke,
      data.keyPressed,
      JSON.stringify(data.appWebsiteDetails),
      data.startTime,
      data.endTime
    );
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

async function fetchCaptureInterval() {
  if (isOffline) {
    const intervals = await store.get('intervals');

    // 1) Screenshot capture interval
    captureIntervalMinutes = intervals.captureIntervalMinutes;

    // 2) Activity interval
    activityIntervalMinutes = intervals.activityIntervalMinutes;

    // 3) Speed location interval
    activitySpeedLocationInterval = +intervals.activitySpeedLocationInterval;

    if (mainWindow) {
      mainWindow.webContents.send(
        'capture-interval',
        intervals.captureIntervalMinutes
      );
      mainWindow.webContents.send(
        'acitivity-interval',
        intervals.activityIntervalMinutes
      );
      mainWindow.webContents.send(
        'activity-speed-location-interval',
        +intervals.activitySpeedLocationInterval
      );
    }
  } else {
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
          captureIntervalMinutes?.toFixed(1) || DEFAULT_CAPTURE_INTERVAL
        );
        mainWindow.webContents.send(
          'acitivity-interval',
          activityIntervalMinutes || DEFAULT_ACTIVITY_INTERVAL
        );
        mainWindow.webContents.send(
          'activity-speed-location-interval',
          +activitySpeedLocationInterval ||
            DEFAULT_ACTIVITY_SPEED_LOCATION_INTERVAL
        );
      }

      store.set('intervals', {
        captureIntervalMinutes:
          captureIntervalMinutes?.toFixed(1) || DEFAULT_CAPTURE_INTERVAL,
        activityIntervalMinutes:
          activityIntervalMinutes || DEFAULT_ACTIVITY_INTERVAL,
        activitySpeedLocationInterval:
          +activitySpeedLocationInterval ||
          DEFAULT_ACTIVITY_SPEED_LOCATION_INTERVAL,
      });

      return captureIntervalMinutes;
    } catch (error) {
      console.error('Error fetching capture interval:', error);
      return null;
    }
  }
}

// Create main application window
async function createWindow() {
  await checkInternetConnection();

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
}

// Set up global keyboard listener
const keyboardListener = new GlobalKeyboardListener();
keyboardListener.addListener((e) => {
  if (isLogging && !mainWindow.isFocused()) {
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
            : e.name?.length === 1
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

      if (message === 'scrolled' && isLogging && !mainWindow.isFocused()) {
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

      if (message === 'scrolled' && isLogging && !mainWindow.isFocused()) {
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
ipcMain.on('set-screenshot-type', (event, data) => {
  screenshotType = data || DEFAULT_SCREENSHOT_TYPE;
});

async function captureAndSaveScreenshot() {
  // SCREENSHOT, BACKGROUND, NO-SCREENSHOT, BLURRED-SCREENSHOT
  try {
    if (screenshotType === 'NO-SCREENSHOT') {
      return;
    }

    let captureOptions = {
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    };

    if (screenshotType === 'BACKGROUND') {
      captureOptions.types = ['window'];
      captureOptions.thumbnailSize = { width: 1280, height: 720 };
    }

    const sources = await desktopCapturer.getSources(captureOptions);
    let primaryDisplay;

    if (screenshotType === 'BACKGROUND') {
      primaryDisplay =
        sources.find((source) => source.name !== 'Entire Screen') || sources[0];
    } else {
      primaryDisplay = sources[0];
    }

    if (primaryDisplay) {
      let screenshotBuffer = primaryDisplay.thumbnail.toPNG();

      if (screenshotType === 'BLURRED-SCREENSHOT') {
        try {
          screenshotBuffer = await sharp(screenshotBuffer)
            .blur(10)
            .png()
            .toBuffer();
        } catch (blurError) {
          console.warn(
            'Blur effect failed, using original screenshot:',
            blurError
          );
        }
      }

      let fileName;
      switch (screenshotType) {
        case 'BLURRED-SCREENSHOT':
          fileName = `Blurred_${moment().format('YYYY-MM-DD_HH-mm-ss')}.png`;
          break;
        case 'BACKGROUND':
          fileName = `Background_${moment().format('YYYY-MM-DD_HH-mm-ss')}.png`;
          break;
        default:
          fileName = `Screenshot_${moment().format('YYYY-MM-DD_HH-mm-ss')}.png`;
      }

      const screenshotBlob = new Blob([screenshotBuffer], {
        type: 'image/png',
      });

      const file = new File([screenshotBlob], fileName, { type: 'image/png' });

      const formData = new FormData();
      formData.append('files', file);

      authToken = authToken || (await store.get('authToken'));
      ownerId = ownerId || (await store.get('ownerId'));

      if (!ownerId || !authToken) {
        throw new Error('ownerId or authToken not set');
      }
      formData.append('ownerId', ownerId);

      if (isOffline) {
        try {
          db.prepare(
            `
            INSERT INTO offlineScreenshots (
              authToken,
              ownerId,
              screenshotTakenTime,
              fileName,
              screenshotBlob
            ) VALUES (?, ?, ?, ?, ?)
          `
          ).run(
            authToken,
            ownerId,
            new Date().toISOString(),
            fileName,
            screenshotBuffer // screenshotBuffer is a Buffer, suitable for BLOB
          );
        } catch (err) {
          console.error('Failed to save screenshot offline:', err);
        }
      } else {
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
    (captureIntervalMinutes || DEFAULT_CAPTURE_INTERVAL) * 60 * 1000
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
  } catch (error) {
    console.error('Failed to fetch location:', error.message);
  }

  return location;
});

ipcMain.on('stop-logging', () => {
  isLogging = false;
  stopScreenshotCapture();
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
