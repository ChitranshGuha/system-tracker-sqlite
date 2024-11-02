const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const fs = require('fs');
const { GlobalKeyboardListener } = require('node-global-key-listener');
const moment = require('moment');

let mainWindow;
let isLogging = false;
let screenshotInterval;
let captureIntervalMinutes;

// Activities
let clickCount = 0;
let keyCount = 0;
let accumulatedText = '';

// Idle time
let lastActivityTime = Date.now();
let lastIdleCheckTime = Date.now();
let accumulatedIdleTime = 0;
let idleInterval;

// Function to fetch capture interval from API
ipcMain.on('fetch-capture-interval', async (event) => {
  event.sender.send('capture-interval', captureIntervalMinutes);
});

async function fetchCaptureInterval() {
  try {
    // const response = await axios.get('https://api.example.com/capture-interval');
    // captureIntervalMinutes = response.data.interval;

    await new Promise(resolve => setTimeout(resolve, 1000));
    captureIntervalMinutes = 5; // Simulated API response

    if(mainWindow){
      mainWindow.webContents.send('capture-interval', captureIntervalMinutes)
    }

    return captureIntervalMinutes;
  } catch (error) {
    console.error('Error fetching capture interval:', error);
    return null;
  }
}

// Create main application window
async function createWindow() {
  const isDev = await import('electron-is-dev').then(module => module.default);

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    simpleFullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../renderer/dist/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await fetchCaptureInterval();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Function to update and send stats
function updateStats(isActivity = false) {
  const currentTime = Date.now();
  
  if (!isActivity) {
    // Calculate idle time since last check
    const idleTime = Math.floor((currentTime - lastIdleCheckTime) / 60000); // Convert to minutes
    accumulatedIdleTime += idleTime;
    lastIdleCheckTime = currentTime; // Update last idle check time
  } else {
    // Reset last idle check time when there's activity
    lastIdleCheckTime = currentTime;
    lastActivityTime = currentTime;
  }

  mainWindow.webContents.send('update-stats', { 
    clickCount, 
    keyCount, 
    idleTime: accumulatedIdleTime, 
    accumulatedText,
    lastActive: moment(lastActivityTime).format('hh:mm:ss A') 
  });

  // Clear existing interval and start a new one
  clearInterval(idleInterval);
  startIdleTracking();
}

// Function to start idle tracking
function startIdleTracking() {
  idleInterval = setInterval(() => {
    if (isLogging) {
      updateStats();
    }
  }, 60000); // Check every minute
}

// Set up global keyboard listener
const keyboardListener = new GlobalKeyboardListener();
keyboardListener.addListener((e) => {
  if(isLogging){
    if(e.name === "MOUSE LEFT" || e.name === "MOUSE RIGHT"){
      if(e.state === "UP"){
        clickCount++;
      }
    }
    else{
      if(e.state === "DOWN"){
        keyCount++;
        accumulatedText += e.name === 'SPACE' ? ' ' : e.name.length === 1 ? e.name?.toLowerCase() : "";
      }
    }
  
    updateStats(true);
  }
});

// Function to capture and save screenshot
async function captureAndSaveScreenshot() {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1920, height: 1080 } });
    const primaryDisplay = sources[0]; // Assuming the first source is the primary display

    if (primaryDisplay) {
      const screenshot = primaryDisplay.thumbnail.toPNG();
      const fileName = `Screenshot_${moment().format('YYYY-MM-DD_HH-mm-ss')}.png`;
      const filePath = path.join(app.getPath('pictures'), fileName);
      
      fs.writeFile(filePath, screenshot, (err) => {
        if (err) console.error('Failed to save screenshot:', err);
        else console.log('Screenshot saved:', filePath);
      });
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
}

// Function to start screenshot capture
function startScreenshotCapture() {
  screenshotInterval = setInterval(captureAndSaveScreenshot, captureIntervalMinutes * 60 * 1000);
}

// Function to stop screenshot capture
function stopScreenshotCapture() {
  clearInterval(screenshotInterval);
}


// IPC handlers
ipcMain.on('start-logging', () => {
  isLogging = true;
  clickCount = 0;
  keyCount = 0;
  accumulatedText = '';
  accumulatedIdleTime = 0;
  lastActivityTime = Date.now();
  lastIdleCheckTime = Date.now();
  startIdleTracking();
  startScreenshotCapture();
});

ipcMain.on('stop-logging', () => {
  isLogging = false;
  clearInterval(idleInterval);
  stopScreenshotCapture();
});

ipcMain.on('fetch-capture-interval', async (event) => {
  event.sender.send('capture-interval', captureIntervalMinutes);
});