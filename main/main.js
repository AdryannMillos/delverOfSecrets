const { app } = require('electron');
const path = require('path');
const { createMainWindow } = require('./windows/mainWindow');
const { startLogWatcher } = require('./watchers/logWatcher');
const registerIpcHandlers = require('./ipc');

app.whenReady().then(() => {
  const mainWindow = createMainWindow();
  startLogWatcher(mainWindow);
  registerIpcHandlers();
});
