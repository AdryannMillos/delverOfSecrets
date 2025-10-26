const fs = require('fs');
const path = require('path');
const { createOverlayWindow } = require('../windows/overlayWindow');
const formatData = require('../utils/formatData');
const { getRootLogDir } = require('../utils/paths');

const overlayWindows = new Map();

function startLogWatcher(mainWindow) {
  const rootDir = getRootLogDir();
  const files = [];

  function findFilesRecursive(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) findFilesRecursive(fullPath);
      else if (entry.name.startsWith('Match_GameLog_') && entry.name.endsWith('.dat')) {
        files.push(fullPath);
      }
    }
  }

  findFilesRecursive(rootDir);

  for (const file of files) {
    fs.watchFile(file, { interval: 500 }, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        try {
          // Always process through formatData
          const formatted = formatData(file);
          const payload = {
            file,
            timestamp: new Date().toISOString(),
            data: formatted,
          };

          // Create overlay if missing
          let overlay = overlayWindows.get(file);
          if (!overlay) {
            overlay = createOverlayWindow(file);
            overlayWindows.set(file, overlay);
          }

          // Send fully formatted data
          mainWindow.webContents.send('overlay:dataUpdate', payload);
          overlay.webContents.send('update-data', payload);
        } catch (err) {
          console.error(`Error formatting ${file}:`, err);
        }
      }
    });
  }
}

module.exports = { startLogWatcher };
