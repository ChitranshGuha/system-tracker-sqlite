const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendUserData : (data) => {
    ipcRenderer.send('set-user-data', data);
  },
  sendActivityData: (data) => {
    ipcRenderer.send('set-activity-data', data);
  },
  startLogging: () => ipcRenderer.send('start-logging'),
  stopLogging: () => ipcRenderer.send('stop-logging'),
  onUpdateStats: (callback) => ipcRenderer.on('update-stats', (_, value) => callback(value)),
  getCaptureInterval: (callback) => {
    ipcRenderer.send('fetch-capture-interval');
    ipcRenderer.on('capture-interval', (_, value) => callback(value));
  },
  getActivityInterval: (callback) => {
    ipcRenderer.send('fetch-activity-interval');
    ipcRenderer.on('activity-interval', (_, value) => callback(value));
  },
});