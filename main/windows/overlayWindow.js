const { BrowserWindow } = require('electron');
const path = require('path');

function createOverlayWindow(filePath) {
  const win = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js'),
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, '../../overlay/overlay.html'));
  return win;
}

module.exports = { createOverlayWindow };
