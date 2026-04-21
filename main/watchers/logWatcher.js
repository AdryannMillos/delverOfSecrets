const fs = require('fs');
const path = require('path');
const { createOverlayWindow } = require('../windows/overlayWindow');
const formatData = require('../utils/formatData');
const { getRootLogDir } = require('../utils/paths');
const db = require('../../db/db');

const overlayWindows = new Map();
const debounceTimers = new Map();

function findFilesRecursive(dir, matches = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return matches;
  }
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

function processFile(file, mainWindow) {
  try {
    const formatted = formatData(file);

    // Auto-save if there is at least one game with a winner
    const hasCompletedGame = Object.values(formatted.gameMeta).some(g => g.winner);
    if (hasCompletedGame && formatted.users.length >= 2) {
      db.upsertMatch(file, formatted);
    }

    const payload = {
      file,
      timestamp: new Date().toISOString(),
      data: formatted,
    };

    let overlay = overlayWindows.get(file);
    if (!overlay || overlay.isDestroyed()) {
      overlay = createOverlayWindow(file);
      overlayWindows.set(file, overlay);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('overlay:dataUpdate', payload);
    }
    overlay.webContents.send('update-data', payload);
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}

function syncAllLogsToDB(files) {
  for (const file of files) {
    try {
      const formatted = formatData(file);
      const hasCompletedGame = Object.values(formatted.gameMeta).some(g => g.winner);
      if (hasCompletedGame && formatted.users.length >= 2) {
        db.upsertMatch(file, formatted);
      }
    } catch (err) {
      console.error(`Startup sync error for ${file}:`, err);
    }
  }
}

function startLogWatcher(mainWindow) {
  const rootDir = getRootLogDir();
  const files = findFilesRecursive(rootDir);

  // Silently upsert all log files on startup — fixes orphaned records and stale dates
  syncAllLogsToDB(files);

  for (const file of files) {
    fs.watchFile(file, { interval: 500 }, (curr, prev) => {
      if (curr.mtime <= prev.mtime) return;

      // Debounce: wait 1500ms after last change before processing
      if (debounceTimers.has(file)) clearTimeout(debounceTimers.get(file));
      debounceTimers.set(file, setTimeout(() => {
        debounceTimers.delete(file);
        processFile(file, mainWindow);
      }, 1500));
    });
  }
}

module.exports = { startLogWatcher, findFilesRecursive };
