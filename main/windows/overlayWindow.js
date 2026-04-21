const { BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createOverlayWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173/src/overlay/index.html');
  } else {
    win.loadFile(path.join(__dirname, '../../dist/overlay/index.html'));
  }

  return win;
}

module.exports = { createOverlayWindow };
