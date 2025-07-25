const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  powerMonitor,
  Tray,
  Menu,
} = require('electron');

const sharp = require('sharp');
const store = require('electron-settings');
const path = require('path');
const { GlobalKeyboardListener } = require('node-global-key-listener');
const moment = require('moment');
const fs = require('fs');
const { spawn } = require('child_process');

// API
const { default: axios } = require('axios');
const dns = require('dns');

// Command line functions for performance efficiency.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const IS_PRODUCTION = false;
const API_BASE_URL = `https://webtracker${IS_PRODUCTION ? 'prod' : ''}.infoware.xyz/api`;

// Offline & Online
let isOffline = false;

// Electron Related
let mainWindow;
let tray;
app.isQuiting = false;

// Renderer Data
let isLogging = false;
let screenshotInterval;

const DEFAULT_SCREENSHOT_TYPE = 'SCREENSHOT';
const DEFAULT_CAPTURE_INTERVAL = 10;
const DEFAULT_ACTIVITY_INTERVAL = 1;
const DEFAULT_ACTIVITY_SPEED_LOCATION_INTERVAL = 1800;
const DEFAULT_IDLE_TIME_INTERVAL = 10;
const CACHE_CLEAR_INTERVAL = 30 * 60 * 1000;

let screenshotType = DEFAULT_SCREENSHOT_TYPE;

let captureIntervalMinutes;
let activityIntervalMinutes;
let activitySpeedLocationInterval;
let idleTimeInterval;

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

<<<<<<< HEAD
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

ipcMain.handle('should-not-remove-timer', async () => {
  return shouldNotRemoveTimer;
});

async function syncOfflineData() {
  const authToken = await store.get('authToken');

  // Sync offline stats
  const statsRows = db.prepare('SELECT * FROM offlineStats').all();

  if (statsRows && statsRows?.length > 0) {
    mainWindow.webContents.send('sync-processing', true);
    shouldNotRemoveTimer = true;

    const filteredProjectTaskActivityDetails = statsRows?.filter(
      (row) => row?.mouseClick >= 0 && row?.keystroke >= 0 && row?.scroll >= 0
    );

    const projectTaskActivityDetails = filteredProjectTaskActivityDetails.map(
      (row) => ({
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
      })
    );

    const payload = {
      ownerId:
        ownerId || (await store.get('ownerId')) || statsRows?.[0]?.ownerId,
      projectTaskActivityDetails,
    };

    if (projectTaskActivityDetails && projectTaskActivityDetails?.length > 0) {
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
        const statsCount = db
          .prepare('SELECT COUNT(*) as count FROM offlineStats')
          .get().count;
        if (statsCount === 0) {
          db.prepare(
            "DELETE FROM sqlite_sequence WHERE name='offlineStats'"
          ).run();
        }
      } catch (err) {
        // Remove synced row
        console.error('Failed to sync stats row:', err);
      }
    }

    mainWindow.webContents.send('sync-processing', false);
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
      const screenshotsCount = db
        .prepare('SELECT COUNT(*) as count FROM offlineScreenshots')
        .get().count;
      if (screenshotsCount === 0) {
        db.prepare(
          "DELETE FROM sqlite_sequence WHERE name='offlineScreenshots'"
        ).run();
      }
    } catch (err) {
      console.error('Failed to sync screenshot rows:', err);
    }
  }
}

=======
ipcMain.on('send-session-details', async (event, data) => {
  try {
    await updateSessionDetails(data);
  } catch (err) {
    console.error('Error updating session details:', err);
  }
});
>>>>>>> 61335b8d8f361ff98756c8fe2fc1764d75502eaa
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
<<<<<<< HEAD

=======
    console.log("setting ownerId to:",ownerId);
    setOwnerProject(ownerId);
>>>>>>> 61335b8d8f361ff98756c8fe2fc1764d75502eaa
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

// Function to fetch speed activity interval from API
ipcMain.on('fetch-activity-speed-location-interval', async (event) => {
  event.sender.send(
    'activity-speed-location-interval',
    activitySpeedLocationInterval || DEFAULT_ACTIVITY_SPEED_LOCATION_INTERVAL
  );
});

// Function to fetch idle time interval from API
ipcMain.on('fetch-idle-time-interval', async (event) => {
  event.sender.send(
    'idle-time-interval',
    idleTimeInterval || DEFAULT_IDLE_TIME_INTERVAL
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

    // 4) Idle time interval
    idleTimeInterval = +intervals.idleTimeInterval;

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
      mainWindow.webContents.send(
        'idle-time-interval',
        +intervals.idleTimeInterval
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

      // 4) Idle time interval
      idleTimeInterval = response?.data?.data?.idleTimeInSeconds / 60;

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
        mainWindow.webContents.send(
          'idle-time-interval',
          +idleTimeInterval || DEFAULT_IDLE_TIME_INTERVAL
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
        idleTimeInterval: +idleTimeInterval || DEFAULT_IDLE_TIME_INTERVAL,
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
  const isDev = await import('electron-is-dev').then(
    (module) => module.default
  );

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    simpleFullscreen: true,
    title: 'Activity Tracker - Digital Links',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    skipTaskbar: false,
    minimizable: true,
    closable: true,
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../out/index.html')}`
  );

  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.session.clearCache().then(() => {
        console.log('Cache cleared at:: ', new Date().toLocaleTimeString());
      });
    }
  }, CACHE_CLEAR_INTERVAL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false);

    startPostWindowTasks();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();

      if (tray) {
        tray.displayBalloon({
          iconType: 'info',
          title: 'Activity Tracker',
          content:
            'App is still running in the background. Right-click the tray icon to access options.',
        });
      }

      return false;
    }
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('Window crashed, attempting to reload...');
    if (!mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('Window became unresponsive');
  });

  mainWindow.webContents.on('responsive', () => {
    console.log('Window became responsive again');
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

async function startPostWindowTasks() {
  try {
    await checkInternetConnection();

    const storeToken = await store.get('authToken');

    if (storeToken) {
      authToken = storeToken;
      await fetchCaptureInterval();
      await loadStats();

      setTimeout(() => {
        if (mainWindow?.webContents) {
          mainWindow.webContents.send('update-stats', stats);
        }
      }, 500);
    }
  } catch (err) {
    console.error('Post-launch tasks failed:', err);
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Tracker',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Quit Tracker',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Activity Tracker - Digital Links');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }

      mainWindow.focus();

      if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true);
        mainWindow.setAlwaysOnTop(false);
        mainWindow.showInactive();
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });

  app.on('ready', async () => {
    await createWindow();
    createTray();

    powerMonitor.on('suspend', () => {
      mainWindow.webContents.send('windows-sleep-mode', true);
    });

    powerMonitor.on('resume', () => {
      setTimeout(() => {
        try {
          app.relaunch();
        } catch (err) {
          console.error('Failed to relaunch app after resume:', err);
        } finally {
          app.exit(0);
        }
      }, 500);
    });
  });

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
<<<<<<< HEAD
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
=======
      const screenshotBuffer = primaryDisplay.thumbnail.toPNG();
      const fileName = `Screenshot_${moment().format('YYYY-MM-DD_HH-mm-ss')}.png`;
>>>>>>> 61335b8d8f361ff98756c8fe2fc1764d75502eaa

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

<<<<<<< HEAD
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
=======
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
>>>>>>> 61335b8d8f361ff98756c8fe2fc1764d75502eaa
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

ipcMain.handle('get-ip-address', async () => {
  let ipAddress = null;
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    ipAddress = response.data.ip;
  } catch (error) {
    console.error('Failed to fetch ip address:', error.message);
  }

  return ipAddress;
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
