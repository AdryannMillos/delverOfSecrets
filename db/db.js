const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function getDbPath() {
  try {
    const { app } = require('electron');
    return path.join(app.getPath('userData'), 'mtgo.db');
  } catch {
    return path.join(__dirname, 'mtgo.db');
  }
}
const db = new Database(getDbPath());
db.pragma('foreign_keys = ON');

db.prepare(`
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY,
    match_id INTEGER,
    opponent TEXT,
    player TEXT,
    opponent_cards TEXT,
    player_cards TEXT,
    opponent_mulligans INTEGER,
    player_mulligans INTEGER,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    game1_id INTEGER,
    game2_id INTEGER,
    game3_id INTEGER,
    final_result TEXT,
    player_deck TEXT,
    opponent_deck TEXT,
    notes TEXT,
    source_file TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(game1_id) REFERENCES games(id) ON DELETE SET NULL,
    FOREIGN KEY(game2_id) REFERENCES games(id) ON DELETE SET NULL,
    FOREIGN KEY(game3_id) REFERENCES games(id) ON DELETE SET NULL
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS match_tags (
    match_id INTEGER,
    tag_id INTEGER,
    FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (match_id, tag_id)
)
`).run();

// Migrate existing DBs — add new columns if they don't exist yet
const migrateColumn = (table, column, definition) => {
  const cols = db.pragma(`table_info(${table})`).map(c => c.name);
  if (!cols.includes(column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
};

migrateColumn('matches', 'player_deck', 'TEXT');
migrateColumn('matches', 'opponent_deck', 'TEXT');
migrateColumn('matches', 'notes', 'TEXT');
migrateColumn('matches', 'source_file', 'TEXT');
migrateColumn('matches', 'created_at', "DATETIME DEFAULT '1970-01-01'");
migrateColumn('games', 'created_at', "DATETIME DEFAULT '1970-01-01'");

// Backfill created_at for any match whose date looks like the placeholder or epoch
const staleMatches = db.prepare(
  "SELECT id, source_file FROM matches WHERE source_file IS NOT NULL AND (created_at IS NULL OR created_at <= '1970-01-02')"
).all();
const backfillStmt = db.prepare("UPDATE matches SET created_at = ? WHERE id = ?");
for (const row of staleMatches) {
  try {
    const mtime = fs.statSync(row.source_file).mtime.toISOString();
    backfillStmt.run(mtime, row.id);
  } catch {
    // file no longer exists — leave as-is
  }
}

function insertTag(name) {
  const normalized = name.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(normalized);
  if (existing) return existing.id;
  const info = db.prepare('INSERT INTO tags (name) VALUES (?)').run(normalized);
  return info.lastInsertRowid;
}

function linkTagToMatch(matchId, tagName) {
  const tagId = insertTag(tagName);
  db.prepare('INSERT OR IGNORE INTO match_tags (match_id, tag_id) VALUES (?, ?)').run(matchId, tagId);
}

function insertGame(game) {
  const info = db.prepare(`
    INSERT INTO games (match_id, opponent, player, opponent_cards, player_cards,
      opponent_mulligans, player_mulligans, result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    game.match_id || null,
    game.opponent || '',
    game.player || '',
    JSON.stringify(game.opponent_cards || []),
    JSON.stringify(game.player_cards || []),
    game.opponent_mulligans || 0,
    game.player_mulligans || 0,
    game.result || ''
  );
  return info.lastInsertRowid;
}

function insertMatch(match) {
  const info = db.prepare(`
    INSERT INTO matches (game1_id, game2_id, game3_id, final_result, source_file, created_at)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
  `).run(
    match.game1_id || null,
    match.game2_id || null,
    match.game3_id || null,
    match.final_result || '',
    match.source_file || null,
    match.created_at || null
  );

  const matchId = info.lastInsertRowid;
  if (Array.isArray(match.tags)) {
    for (const t of match.tags) linkTagToMatch(matchId, t);
  }
  return matchId;
}

function upsertMatch(sourceFile, parsedData) {
  const { users, gameMeta } = parsedData;
  if (!Array.isArray(users) || users.length < 2) return null;

  const opponent = users[0];
  const player = users[1];

  const playerWins = Object.values(gameMeta).filter(g => g.winner === player.userName).length;
  const opponentWins = Object.values(gameMeta).filter(g => g.winner === opponent.userName).length;
  const final_result = `${playerWins}-${opponentWins}`;

  let existing = sourceFile
    ? db.prepare('SELECT id FROM matches WHERE source_file = ?').get(sourceFile)
    : null;

  // Claim an orphaned record (saved before source_file tracking) by player+opponent match
  if (!existing && sourceFile) {
    existing = db.prepare(`
      SELECT DISTINCT m.id FROM matches m
      JOIN games g ON g.match_id = m.id
      WHERE m.source_file IS NULL AND LOWER(g.player) = LOWER(?) AND LOWER(g.opponent) = LOWER(?)
      LIMIT 1
    `).get(player.userName, opponent.userName);
    if (existing) {
      let fileMtime = null;
      try { fileMtime = fs.statSync(sourceFile).mtime.toISOString(); } catch { /* ignore */ }
      db.prepare('UPDATE matches SET source_file = ?, created_at = ? WHERE id = ?')
        .run(sourceFile, fileMtime, existing.id);
    }
  }

  if (existing) {
    // Delete existing games so we can re-insert fresh parsed data
    db.prepare('DELETE FROM games WHERE match_id = ?').run(existing.id);

    const gameIds = [];
    for (let i = 1; i <= 3; i++) {
      const gameKey = `game${i}`;
      if (!gameMeta[gameKey]) continue;

      const mulligans = gameMeta[gameKey]?.mulligans || {};
      const result = gameMeta[gameKey]?.winner
        ? gameMeta[gameKey].winner === player.userName ? 'win' : 'loss'
        : 'unknown';

      const gameId = insertGame({
        match_id: existing.id,
        opponent: opponent.userName,
        player: player.userName,
        opponent_cards: opponent[gameKey] || [],
        player_cards: player[gameKey] || [],
        opponent_mulligans: mulligans[opponent.userName] || 0,
        player_mulligans: mulligans[player.userName] || 0,
        result,
      });
      gameIds.push(gameId);
    }

    db.prepare(`
      UPDATE matches SET game1_id = ?, game2_id = ?, game3_id = ?, final_result = ? WHERE id = ?
    `).run(gameIds[0] || null, gameIds[1] || null, gameIds[2] || null, final_result, existing.id);

    return existing.id;
  }

  // Fresh insert
  const gameIds = [];
  for (let i = 1; i <= 3; i++) {
    const gameKey = `game${i}`;
    if (!gameMeta[gameKey]) continue;

    const mulligans = gameMeta[gameKey]?.mulligans || {};
    const result = gameMeta[gameKey]?.winner
      ? gameMeta[gameKey].winner === player.userName ? 'win' : 'loss'
      : 'unknown';

    const gameId = insertGame({
      match_id: null,
      opponent: opponent.userName,
      player: player.userName,
      opponent_cards: opponent[gameKey] || [],
      player_cards: player[gameKey] || [],
      opponent_mulligans: mulligans[opponent.userName] || 0,
      player_mulligans: mulligans[player.userName] || 0,
      result,
    });
    gameIds.push(gameId);
  }

  let fileMtime = null;
  if (sourceFile) {
    try { fileMtime = fs.statSync(sourceFile).mtime.toISOString(); } catch { /* ignore */ }
  }

  const matchId = insertMatch({
    game1_id: gameIds[0] || null,
    game2_id: gameIds[1] || null,
    game3_id: gameIds[2] || null,
    final_result,
    source_file: sourceFile,
    created_at: fileMtime,
  });

  for (const gameId of gameIds) {
    db.prepare('UPDATE games SET match_id = ? WHERE id = ?').run(matchId, gameId);
  }

  return matchId;
}

function updateMatchMeta(id, { playerDeck, opponentDeck, notes, tags } = {}) {
  db.prepare(`
    UPDATE matches SET player_deck = ?, opponent_deck = ?, notes = ? WHERE id = ?
  `).run(
    playerDeck ? playerDeck.trim() : null,
    opponentDeck ? opponentDeck.trim() : null,
    notes || null,
    id
  );

  if (Array.isArray(tags)) {
    db.prepare('DELETE FROM match_tags WHERE match_id = ?').run(id);
    for (const t of tags) linkTagToMatch(id, t);
  }
}

function deleteMatch(id) {
  db.prepare('DELETE FROM matches WHERE id = ?').run(id);
}

function getMatches(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.fromDate) {
    conditions.push("m.created_at >= ?");
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    conditions.push("m.created_at <= ?");
    params.push(filters.toDate + ' 23:59:59');
  }
  if (filters.result) {
    conditions.push("m.final_result = ?");
    params.push(filters.result);
  }
  if (filters.playerDeck) {
    conditions.push("LOWER(m.player_deck) LIKE LOWER(?)");
    params.push(`%${filters.playerDeck}%`);
  }
  if (filters.opponentDeck) {
    conditions.push("LOWER(m.opponent_deck) LIKE LOWER(?)");
    params.push(`%${filters.opponentDeck}%`);
  }
  if (filters.playerName) {
    conditions.push("EXISTS (SELECT 1 FROM games g WHERE g.match_id = m.id AND (LOWER(g.player) = LOWER(?) OR LOWER(g.opponent) = LOWER(?)))");
    params.push(filters.playerName, filters.playerName);
  }
  if (filters.opponent) {
    conditions.push("EXISTS (SELECT 1 FROM games g WHERE g.match_id = m.id AND LOWER(g.opponent) LIKE LOWER(?))");
    params.push(`%${filters.opponent}%`);
  }
  if (filters.tag) {
    conditions.push("EXISTS (SELECT 1 FROM match_tags mt JOIN tags t ON t.id = mt.tag_id WHERE mt.match_id = m.id AND t.name = LOWER(?))");
    params.push(filters.tag);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM matches m ${where} ORDER BY m.created_at DESC`).all(...params);
}

function getMatchDetails(matchId) {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) return null;

  const games = db.prepare('SELECT * FROM games WHERE match_id = ? ORDER BY id').all(matchId);
  const tags = db.prepare(`
    SELECT t.name FROM tags t
    JOIN match_tags mt ON mt.tag_id = t.id
    WHERE mt.match_id = ?
  `).all(matchId).map(r => r.name);

  return { ...match, games, tags };
}

function getStats(filters = {}) {
  const matches = getMatches(filters).map(m => getMatchDetails(m.id));

  const total = matches.length;
  const wins = matches.filter(m => {
    const [pw = 0, ow = 0] = (m.final_result || '0-0').split('-').map(Number);
    const game = m.games?.[0];
    const userIsPlayer = !game || game.player.toLowerCase() === (filters.playerName || '').toLowerCase();
    return userIsPlayer ? pw > ow : ow > pw;
  }).length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const pn = (filters.playerName || '').toLowerCase();

  // Per-opponent stats — group by lowercased name, display first-seen casing
  const opponentMap = {};
  for (const match of matches) {
    const game = match.games[0];
    const rawName = game
      ? (game.player.toLowerCase() === pn ? game.opponent : game.player)
      : 'Unknown';
    const key = rawName.toLowerCase();
    if (!opponentMap[key]) opponentMap[key] = { display: rawName, played: 0, won: 0 };
    opponentMap[key].played++;
    const [pw = 0, ow = 0] = (match.final_result || '0-0').split('-').map(Number);
    const userIsPlayer = !game || game.player.toLowerCase() === pn;
    if (userIsPlayer ? pw > ow : ow > pw) opponentMap[key].won++;
  }
  const perOpponent = Object.values(opponentMap).map(s => ({
    name: s.display,
    played: s.played,
    won: s.won,
    lost: s.played - s.won,
    winRate: Math.round((s.won / s.played) * 100),
  })).sort((a, b) => b.played - a.played);

  // Per-matchup stats — group by lowercased deck names
  const matchupMap = {};
  for (const match of matches) {
    const pd = (match.player_deck || 'Unknown');
    const od = (match.opponent_deck || 'Unknown');
    const key = `${pd.toLowerCase()} vs ${od.toLowerCase()}`;
    if (!matchupMap[key]) matchupMap[key] = { played: 0, won: 0, playerDeck: pd, opponentDeck: od };
    matchupMap[key].played++;
    const [pw = 0, ow = 0] = (match.final_result || '0-0').split('-').map(Number);
    const game = match.games?.[0];
    const userIsPlayer = !game || game.player.toLowerCase() === pn;
    if (userIsPlayer ? pw > ow : ow > pw) matchupMap[key].won++;
  }
  const perMatchup = Object.values(matchupMap).map(s => ({
    ...s,
    lost: s.played - s.won,
    winRate: Math.round((s.won / s.played) * 100),
  })).sort((a, b) => b.played - a.played);

  // Most played decks — group by lowercased name
  const playerDeckMap = {};
  const opponentDeckMap = {};
  for (const match of matches) {
    const pd = match.player_deck;
    const od = match.opponent_deck;
    if (pd) {
      const key = pd.toLowerCase();
      if (!playerDeckMap[key]) playerDeckMap[key] = { display: pd, count: 0 };
      playerDeckMap[key].count++;
    }
    if (od) {
      const key = od.toLowerCase();
      if (!opponentDeckMap[key]) opponentDeckMap[key] = { display: od, count: 0 };
      opponentDeckMap[key].count++;
    }
  }
  const mostPlayedDecks = Object.values(playerDeckMap)
    .map(({ display, count }) => ({ name: display, count }))
    .sort((a, b) => b.count - a.count);
  const mostFacedDecks = Object.values(opponentDeckMap)
    .map(({ display, count }) => ({ name: display, count }))
    .sort((a, b) => b.count - a.count);

  return { total, wins, losses: total - wins, winRate, perOpponent, perMatchup, mostPlayedDecks, mostFacedDecks };
}

module.exports = {
  db,
  insertGame,
  insertMatch,
  insertTag,
  linkTagToMatch,
  upsertMatch,
  updateMatchMeta,
  deleteMatch,
  getMatches,
  getMatchDetails,
  getStats,
};
