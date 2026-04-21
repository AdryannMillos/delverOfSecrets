const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // History & matches
  getHistory: (filters) => ipcRenderer.invoke('get-history', filters),
  saveMatch: (matchData) => ipcRenderer.invoke('save-match', matchData),
  updateMatch: (data) => ipcRenderer.invoke('update-match', data),
  deleteMatch: (id) => ipcRenderer.invoke('delete-match', id),

  // Stats
  getStats: (filters) => ipcRenderer.invoke('get-stats', filters),

  // Log utilities
  getAllGameLogs: () => ipcRenderer.invoke('get-all-game-logs'),
  formatData: (filePath) => ipcRenderer.invoke('format-data', filePath),

  // Live overlay updates (main window listener)
  onOverlayDataUpdate: (callback) =>
    ipcRenderer.on('overlay:dataUpdate', (_event, data) => callback(data)),

  // Overlay window controls
  onUpdateData: (callback) =>
    ipcRenderer.on('update-data', (_event, data) => callback(data)),
  closeOverlay: () => ipcRenderer.send('overlay-close'),
  minimizeOverlay: () => ipcRenderer.send('overlay-minimize'),
  maximizeOverlay: () => ipcRenderer.send('overlay-maximize'),
});
