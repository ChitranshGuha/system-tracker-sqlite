const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startLogging: () => ipcRenderer.send('start-logging'),
  stopLogging: () => ipcRenderer.send('stop-logging'),
  onUpdateStats: (callback) => ipcRenderer.on('update-stats', (_, value) => callback(value)),
});