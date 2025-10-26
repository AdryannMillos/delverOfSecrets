const { ipcMain, BrowserWindow } = require('electron');

function registerOverlayHandlers() {
  const openTabs = new Set();

  ipcMain.on('overlay-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.close();
  });

  ipcMain.on('overlay-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.minimize();
  });

  ipcMain.on('overlay-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
}

module.exports = registerOverlayHandlers;
