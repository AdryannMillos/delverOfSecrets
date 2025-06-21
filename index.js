const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const formatData = require('./formatData');
const latestMatchGameLogDatFile = require('./mostRecent');

let mainWindow;

function createWindow() {
mainWindow = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false
  }
});


  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  const file = latestMatchGameLogDatFile();

  if (!file) {
    console.error('No file found to watch.');
    return;
  }

  console.log('Watching file for changes:', file);

  fs.watchFile(file, { interval: 500 }, (curr, prev) => {
    if (curr.mtime > prev.mtime) {
      console.log('\nFile changed. Re-processing...\n');
      try {
        const formattedData = formatData(file);
        console.log('Formatted data:', formattedData[0].game1);
        mainWindow.webContents.send('update-data', formattedData);
      } catch (err) {
        console.error('Error reading or formatting file:', err.message);
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
