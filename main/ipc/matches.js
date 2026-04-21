const { ipcMain } = require('electron');
const db = require('../../db/db');
const { findFilesRecursive } = require('../watchers/logWatcher');
const { getRootLogDir } = require('../utils/paths');
const formatData = require('../utils/formatData');

function registerMatchHandlers() {
  // Fetch history with optional filters
  ipcMain.handle('get-history', (_event, filters = {}) => {
    const matches = db.getMatches(filters);
    return matches.map(m => db.getMatchDetails(m.id));
  });

  // Save a match manually (used by sync fallback)
  ipcMain.handle('save-match', (_event, matchData) => {
    try {
      const { users, gameMeta } = matchData;
      if (!Array.isArray(users) || users.length < 2) throw new Error('Invalid match data');
      const matchId = db.upsertMatch(null, { users, gameMeta });
      return { success: true, matchId };
    } catch (err) {
      console.error('Error saving match:', err);
      return { success: false, error: err.message };
    }
  });

  // Update match metadata (deck names, notes, tags)
  ipcMain.handle('update-match', (_event, { id, playerDeck, opponentDeck, notes, tags }) => {
    try {
      db.updateMatchMeta(id, { playerDeck, opponentDeck, notes, tags });
      return { success: true };
    } catch (err) {
      console.error('Error updating match:', err);
      return { success: false, error: err.message };
    }
  });

  // Delete a match
  ipcMain.handle('delete-match', (_event, id) => {
    try {
      db.deleteMatch(id);
      return { success: true };
    } catch (err) {
      console.error('Error deleting match:', err);
      return { success: false, error: err.message };
    }
  });

  // Aggregated stats
  ipcMain.handle('get-stats', (_event, filters = {}) => {
    return db.getStats(filters);
  });

  // Find all MTGO logs recursively
  ipcMain.handle('get-all-game-logs', () => {
    const rootDir = getRootLogDir();
    return findFilesRecursive(rootDir);
  });

  // Parse a log file
  ipcMain.handle('format-data', (_event, filePath) => {
    return formatData(filePath);
  });
}

module.exports = registerMatchHandlers;
