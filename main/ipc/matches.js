const { ipcMain } = require("electron");
const db = require("../../db/db");
const { findFilesRecursive } = require("../watchers/logWatcher");
const { getRootLogDir } = require("../utils/paths");
const formatData = require("../utils/formatData");

const { insertGame, insertMatch, linkTagToMatch, getMatches, getMatchDetails } =
  db;

function registerMatchHandlers() {
  // Save a match and its games
  ipcMain.handle("save-match", (event, matchData) => {
    try {
      const {
        users,
        gameMeta,
        match_tags = [],
        player_tags = [],
        opponent_tags = [],
      } = matchData;

      if (!Array.isArray(users) || users.length < 2) {
        throw new Error("Invalid match data: missing users");
      }

      const opponent = users[0];
      const player = users[1];

      // Extract game data (up to 3 games)
      const gameIds = [];
      for (let i = 1; i <= 3; i++) {
        const gameKey = `game${i}`;
        if (!gameMeta[gameKey]) continue; // skip non-existent games

        const opponentCards = opponent[gameKey] || [];
        const playerCards = player[gameKey] || [];
        const mulligans = gameMeta[gameKey]?.mulligans || {};
        const result = gameMeta[gameKey]?.winner
          ? gameMeta[gameKey].winner === player.userName
            ? "win"
            : "loss"
          : "unknown";

        const gameId = insertGame({
          match_id: null, // temporarily null, will update later if needed
          opponent: opponent.userName,
          player: player.userName,
          opponent_cards: opponentCards,
          player_cards: playerCards,
          opponent_mulligans: mulligans[opponent.userName] || 0,
          player_mulligans: mulligans[player.userName] || 0,
          result,
        });

        gameIds.push(gameId);
      }

      // Determine final match result based on majority wins
      const playerWins = Object.values(gameMeta).filter(
        (g) => g.winner === player.userName
      ).length;
      const opponentWins = Object.values(gameMeta).filter(
        (g) => g.winner === opponent.userName
      ).length;
      const final_result = `${playerWins}-${opponentWins}`;

      // Insert match referencing the 3 games
      const matchId = insertMatch({
        game1_id: gameIds[0] || null,
        game2_id: gameIds[1] || null,
        game3_id: gameIds[2] || null,
        final_result,
        match_tags,
        player_tags,
        opponent_tags,
      });

      // Update each game to include match_id
      const updateStmt = db.db.prepare(
        "UPDATE games SET match_id = ? WHERE id = ?"
      );
      for (const gameId of gameIds) {
        updateStmt.run(matchId, gameId);
      }

      // Link tags to match
      if (Array.isArray(match_tags)) {
        match_tags.forEach((tag) => linkTagToMatch(matchId, tag));
      }

      return { success: true, matchId, gameIds, final_result };
    } catch (error) {
      console.error("Error saving match:", error);
      return { success: false, error: error.message };
    }
  });

  // Fetch all matches with details
  ipcMain.handle("get-history", () => {
    const matches = getMatches();
    return matches.map((m) => getMatchDetails(m.id));
  });

  // Find all MTGO logs recursively
  ipcMain.handle("get-all-game-logs", () => {
    const rootDir = getRootLogDir();
    const logs = [];
    findFilesRecursive(rootDir, logs);
    return logs;
  });

  // Format log file
  ipcMain.handle("format-data", (event, filePath) => {
    return formatData(filePath);
  });
}

module.exports = registerMatchHandlers;
