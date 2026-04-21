const fs = require('fs');
const path = require('path');
const { createOverlayWindow } = require('../windows/overlayWindow');
const formatData = require('../utils/formatData');
const { getRootLogDir } = require('../utils/paths');
const db = require('../../db/db');

const overlayWindows = new Map();
const debounceTimers = new Map();
const watchedFiles = new Set();

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

    const hasCompletedGame = Object.values(formatted.gameMeta).some(g => g.winner);
    if (hasCompletedGame && formatted.users.length >= 2) {
      db.upsertMatch(file, formatted);
    }

    const payload = {
      file,
      timestamp: new Date().toISOString(),
      data: formatted,
    };

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('overlay:dataUpdate', payload);
    }

    let overlay = overlayWindows.get(file);
    if (!overlay || overlay.isDestroyed()) {
      overlay = createOverlayWindow();
      overlayWindows.set(file, overlay);
      // Wait for the window to finish loading before sending data
      overlay.webContents.once('did-finish-load', () => {
        overlay.webContents.send('update-data', payload);
      });
    } else {
      overlay.webContents.send('update-data', payload);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}

function watchFile(file, mainWindow) {
  if (watchedFiles.has(file)) return;
  watchedFiles.add(file);

  fs.watchFile(file, { interval: 500 }, (curr, prev) => {
    if (curr.mtime <= prev.mtime) return;

    if (debounceTimers.has(file)) clearTimeout(debounceTimers.get(file));
    debounceTimers.set(file, setTimeout(() => {
      debounceTimers.delete(file);
      processFile(file, mainWindow);
    }, 1500));
  });
}

async function syncAllLogsToDB(files) {
  for (const file of files) {
    await new Promise(resolve => setImmediate(resolve));
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
  const existingFiles = findFilesRecursive(rootDir);

  setImmediate(() => syncAllLogsToDB(existingFiles));

  for (const file of existingFiles) {
    watchFile(file, mainWindow);
  }

  // Watch the directory tree for new .dat files created during new matches
  try {
    fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      if (!filename.includes('Match_GameLog_') || !filename.endsWith('.dat')) return;

      // filename may be relative on Windows
      const fullPath = path.isAbsolute(filename) ? filename : path.join(rootDir, filename);

      if (watchedFiles.has(fullPath)) return;

      // Small delay to ensure the file exists and has initial content
      setTimeout(() => {
        if (fs.existsSync(fullPath)) {
          watchFile(fullPath, mainWindow);
        }
      }, 1000);
    });
  } catch (err) {
    console.error('Directory watch error:', err);
  }
}

module.exports = { startLogWatcher, findFilesRecursive };
