const fs = require('fs');
const path = require('path');
const { createOverlayWindow } = require('../windows/overlayWindow');
const formatData = require('../utils/formatData');
const { getRootLogDir } = require('../utils/paths');

const overlayWindows = new Map();

// --- Exportable recursive finder ---
function findFilesRecursive(dir, matches = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFilesRecursive(fullPath, matches);
    } else if (entry.name.startsWith('Match_GameLog_') && entry.name.endsWith('.dat')) {
      matches.push(fullPath);
    }
  }
  return matches;
}

// --- Start watching logs ---
function startLogWatcher(mainWindow) {
  const rootDir = getRootLogDir();
  const files = findFilesRecursive(rootDir);

  for (const file of files) {
    fs.watchFile(file, { interval: 500 }, (curr, prev) => {
      if (curr.mtime > prev.mtime) {
        try {
          // Format the data
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

          // Send updates
          mainWindow.webContents.send('overlay:dataUpdate', payload);
          overlay.webContents.send('update-data', payload);
        } catch (err) {
          console.error(`Error formatting ${file}:`, err);
        }
      }
    });
  }
}

module.exports = { startLogWatcher, findFilesRecursive };
