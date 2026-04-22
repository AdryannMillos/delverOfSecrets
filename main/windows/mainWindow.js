const { BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173/src/renderer/index.html');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../../dist/src/renderer/index.html'));
  }

  return win;
}

module.exports = { createMainWindow };
