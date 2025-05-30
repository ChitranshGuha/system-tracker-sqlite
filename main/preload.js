const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Internet Connection
  notifyOffline: () => ipcRenderer.send('app-offline'),
  exitApp: () => ipcRenderer.send('exit-app'),
  onSuspend: (callback) => ipcRenderer.on('suspend', callback),
  removeSuspendListener: (callback) =>
    ipcRenderer.removeListener('suspend', callback),

  // Renderer's Data

  sendUserData: (data) => {
    ipcRenderer.send('set-user-data', data);
  },
  sendActivityData: (data) => ipcRenderer.invoke('set-activity-data', data),
  startLogging: () => ipcRenderer.invoke('start-logging'),
  clearStoreStats: () => ipcRenderer.invoke('clear-store-stats'),
  restartLogging: () => ipcRenderer.invoke('restart-logging'),
  sendSessionDetails: (data) => ipcRenderer.send('send-session-details', data),
  getGeoLocation: () => ipcRenderer.invoke('get-location'),
  stopLogging: () => ipcRenderer.send('stop-logging'),
  onUpdateStats: (callback) =>
    ipcRenderer.on('update-stats', (_, value) => callback(value)),
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
  // getActivityReportInterval: (callback) => {
  //   ipcRenderer.send('fetch-activity-report-interval');
  //   ipcRenderer.on('activity-report-interval', (_, value) => callback(value));
  // },
  getInitialStats: () => ipcRenderer.invoke('get-initial-stats'),
});
