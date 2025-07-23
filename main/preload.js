const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // exit app
  exitApp: () => ipcRenderer.send('exit-app'),

  // Internet Connection
  notifyOffline: () => ipcRenderer.send('app-offline'),
  notifyOnline: () => ipcRenderer.send('app-online'),
  shouldNotRemoveTimer: () => ipcRenderer.invoke('should-not-remove-timer'),
  onSyncing: (callback) =>
    ipcRenderer.on('sync-processing', (_, value) => callback(value)),
  removeSyncingListener: () =>
    ipcRenderer.removeAllListeners('sync-processing'),

  onSleepMode: (callback) =>
    ipcRenderer.on('windows-sleep-mode', (_, value) => callback(value)),
  removeSleepModeListeners: () =>
    ipcRenderer.removeAllListeners('windows-sleep-mode'),

  // Renderer's Data
  sendScreenshotType: (data) => ipcRenderer.send('set-screenshot-type', data),
  sendUserData: (data) => {
    ipcRenderer.send('set-user-data', data);
  },
  sendActivityData: (data) => ipcRenderer.invoke('set-activity-data', data),

  sendOfflineActivityData: (data) =>
    ipcRenderer.invoke('offline-activity-data', data),

  getInitialStats: () => ipcRenderer.invoke('get-initial-stats'),
  startLogging: () => ipcRenderer.invoke('start-logging'),
  clearStoreStats: () => ipcRenderer.invoke('clear-store-stats'),
  restartLogging: () => ipcRenderer.invoke('restart-logging'),
<<<<<<< HEAD
=======
  sendSessionDetails: (data) => ipcRenderer.send('send-session-details', data),
  getGeoLocation: () => ipcRenderer.invoke('get-location'),
>>>>>>> 61335b8d8f361ff98756c8fe2fc1764d75502eaa
  stopLogging: () => ipcRenderer.send('stop-logging'),
  onUpdateStats: (callback) =>
    ipcRenderer.on('update-stats', (_, value) => callback(value)),

  // Getting geographical data
  getGeoLocation: () => ipcRenderer.invoke('get-location'),
  getIpAddress: () => ipcRenderer.invoke('get-ip-address'),

  // Interval's data
  getCaptureInterval: (callback) => {
    ipcRenderer.send('fetch-capture-interval');
    ipcRenderer.on('capture-interval', (_, value) => callback(value));
  },
  getActivityInterval: (callback) => {
    ipcRenderer.send('fetch-activity-interval');
    ipcRenderer.on('activity-interval', (_, value) => callback(value));
  },
  getActivitySpeedLocationInterval: (callback) => {
    ipcRenderer.send('fetch-activity-speed-location-interval');
    ipcRenderer.on('activity-speed-location-interval', (_, value) =>
      callback(value)
    );
  },
  getIdleTimeInterval: (callback) => {
    ipcRenderer.send('fetch-idle-time-interval');
    ipcRenderer.on('idle-time-interval', (_, value) => callback(value));
  },
});
