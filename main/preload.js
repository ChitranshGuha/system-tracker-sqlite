const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // exit app
  exitApp: () => ipcRenderer.send('exit-app'),

  // Internet Connection
  notifyOffline: () => ipcRenderer.send('app-offline'),
  notifyOnline: () => ipcRenderer.send('app-online'),
  shouldNotRemoveTimer: () => ipcRenderer.invoke('should-nots-remove-timer'),

  onSuspend: (callback) => ipcRenderer.on('suspend', callback),
  removeSuspendListener: (callback) =>
    ipcRenderer.removeListener('suspend', callback),

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
  getGeoLocation: () => ipcRenderer.invoke('get-location'),
  stopLogging: () => ipcRenderer.send('stop-logging'),
  onUpdateStats: (callback) =>
    ipcRenderer.on('update-stats', (_, value) => callback(value)),

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
});
