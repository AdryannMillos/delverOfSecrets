const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateData: (callback) => ipcRenderer.on('update-data', (event, data) => callback(data)),
  saveMatch: (matchData) => ipcRenderer.invoke('save-match', matchData),
  getHistory: () => ipcRenderer.invoke('get-history'),

  closeOverlay: () => ipcRenderer.send('overlay-close'),
  minimizeOverlay: () => ipcRenderer.send('overlay-minimize'),
  maximizeOverlay: () => ipcRenderer.send('overlay-maximize'),
  
  getAllGameLogs: () => ipcRenderer.invoke('get-all-game-logs'),

});
