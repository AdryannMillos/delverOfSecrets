const { ipcMain } = require('electron');
const db = require('../../db/db');

function registerMatchHandlers() {
  ipcMain.handle('save-match', (event, matchData) => {
    const { format, deck, opponent, result, tags, plays } = matchData;

    const matchStmt = db.db.prepare(`
      INSERT INTO matches (date, format, deck, opponent, result, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const info = matchStmt.run(
      new Date().toISOString(),
      format,
      deck,
      opponent,
      result,
      JSON.stringify(tags)
    );

    const playStmt = db.db.prepare(`
      INSERT INTO plays (match_id, game_number, player, card, occurrence)
      VALUES (?, ?, ?, ?, ?)
    `);

    plays.forEach(p => {
      playStmt.run(info.lastInsertRowid, p.game_number, p.player, p.card, p.occurrence);
    });

    return { success: true };
  });

  ipcMain.handle('get-history', () => {
    const matches = db.getMatches();
    return matches.map(m => ({
      ...m,
      plays: db.getPlays(m.id),
    }));
  });

  ipcMain.handle('get-all-game-logs', () => {
  const logs = [];
  findFilesRecursive(rootDir, logs);
  return logs;
});

}

module.exports = registerMatchHandlers;
