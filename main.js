const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { GlobalKeyboardListener } = require('node-global-key-listener');
const moment = require('moment');

let mainWindow;
let isLogging = false;

// Activities
let clickCount = 0;
let keyCount = 0;
let accumulatedText = '';

// Idle time
let lastActivityTime = Date.now();
let lastIdleCheckTime = Date.now();
let accumulatedIdleTime = 0;
let idleInterval;

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
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../renderer/out/index.html')}`
  );

  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
        if(!isButtonClick(e)) {
          clickCount++;
        }
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

// IPC handlers
function isButtonClick(event) {
  const buttonIds = ['start-logging', 'stop-logging'];
  return buttonIds.some(id => event.name === id);
}

ipcMain.on('start-logging', () => {
  isLogging = true;
  clickCount = 0;
  keyCount = 0;
  accumulatedText = '';
  accumulatedIdleTime = 0;
  lastActivityTime = Date.now();
  lastIdleCheckTime = Date.now();
  startIdleTracking();
});

ipcMain.on('stop-logging', () => {
  isLogging = false;
  clearInterval(idleInterval);
});