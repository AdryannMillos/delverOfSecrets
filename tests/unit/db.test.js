import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createRequire } from 'module';

// Build an in-memory version of the DB module
function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  db.prepare(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY, match_id INTEGER, opponent TEXT, player TEXT,
    opponent_cards TEXT, player_cards TEXT, opponent_mulligans INTEGER,
    player_mulligans INTEGER, result TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY, game1_id INTEGER, game2_id INTEGER, game3_id INTEGER,
    final_result TEXT, player_deck TEXT, opponent_deck TEXT, notes TEXT,
    source_file TEXT UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT UNIQUE)`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS match_tags (
    match_id INTEGER, tag_id INTEGER,
    FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (match_id, tag_id)
  )`).run();

  function insertTag(name) {
    const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
    if (existing) return existing.id;
    return db.prepare('INSERT INTO tags (name) VALUES (?)').run(name).lastInsertRowid;
  }

  function linkTagToMatch(matchId, tagName) {
    const tagId = insertTag(tagName);
    db.prepare('INSERT OR IGNORE INTO match_tags (match_id, tag_id) VALUES (?, ?)').run(matchId, tagId);
  }

  function insertGame(game) {
    return db.prepare(`
      INSERT INTO games (match_id, opponent, player, opponent_cards, player_cards,
        opponent_mulligans, player_mulligans, result) VALUES (?,?,?,?,?,?,?,?)
    `).run(
      game.match_id || null, game.opponent || '', game.player || '',
      JSON.stringify(game.opponent_cards || []), JSON.stringify(game.player_cards || []),
      game.opponent_mulligans || 0, game.player_mulligans || 0, game.result || ''
    ).lastInsertRowid;
  }

  function insertMatch(match) {
    const id = db.prepare(`
      INSERT INTO matches (game1_id, game2_id, game3_id, final_result, source_file)
      VALUES (?,?,?,?,?)
    `).run(match.game1_id || null, match.game2_id || null, match.game3_id || null,
      match.final_result || '', match.source_file || null).lastInsertRowid;
    if (Array.isArray(match.tags)) match.tags.forEach(t => linkTagToMatch(id, t));
    return id;
  }

  function updateMatchMeta(id, { playerDeck, opponentDeck, notes, tags } = {}) {
    db.prepare('UPDATE matches SET player_deck=?, opponent_deck=?, notes=? WHERE id=?')
      .run(playerDeck || null, opponentDeck || null, notes || null, id);
    if (Array.isArray(tags)) {
      db.prepare('DELETE FROM match_tags WHERE match_id=?').run(id);
      tags.forEach(t => linkTagToMatch(id, t));
    }
  }

  function deleteMatch(id) {
    db.prepare('DELETE FROM matches WHERE id=?').run(id);
  }

  function getMatchDetails(matchId) {
    const match = db.prepare('SELECT * FROM matches WHERE id=?').get(matchId);
    if (!match) return null;
    const games = db.prepare('SELECT * FROM games WHERE match_id=? ORDER BY id').all(matchId);
    const tags = db.prepare(`
      SELECT t.name FROM tags t JOIN match_tags mt ON mt.tag_id=t.id WHERE mt.match_id=?
    `).all(matchId).map(r => r.name);
    return { ...match, games, tags };
  }

  return { db, insertGame, insertMatch, updateMatchMeta, deleteMatch, getMatchDetails, linkTagToMatch };
}

describe('db functions', () => {
  let dbCtx;
  beforeEach(() => { dbCtx = createTestDb(); });

  it('inserts a game and retrieves it', () => {
    const matchId = dbCtx.insertMatch({ final_result: '2-0' });
    const gameId = dbCtx.insertGame({
      match_id: matchId, opponent: 'Bob', player: 'Alice',
      opponent_cards: [{ card: 'Counterspell', occurrence: 1 }],
      player_cards: [{ card: 'Bolt', occurrence: 2 }],
      opponent_mulligans: 0, player_mulligans: 1, result: 'win',
    });
    const details = dbCtx.getMatchDetails(matchId);
    expect(details.games).toHaveLength(1);
    expect(details.games[0].result).toBe('win');
    expect(JSON.parse(details.games[0].player_cards)[0].card).toBe('Bolt');
  });

  it('links and retrieves tags on a match', () => {
    const matchId = dbCtx.insertMatch({ final_result: '2-1', tags: ['League', 'Competitive'] });
    const details = dbCtx.getMatchDetails(matchId);
    expect(details.tags).toContain('League');
    expect(details.tags).toContain('Competitive');
  });

  it('updates match metadata', () => {
    const matchId = dbCtx.insertMatch({ final_result: '2-0' });
    dbCtx.updateMatchMeta(matchId, {
      playerDeck: 'Burn', opponentDeck: 'Control', notes: 'Close match', tags: ['Ranked'],
    });
    const details = dbCtx.getMatchDetails(matchId);
    expect(details.player_deck).toBe('Burn');
    expect(details.opponent_deck).toBe('Control');
    expect(details.notes).toBe('Close match');
    expect(details.tags).toContain('Ranked');
  });

  it('deletes a match and cascades to games', () => {
    const matchId = dbCtx.insertMatch({ final_result: '2-0' });
    dbCtx.insertGame({ match_id: matchId, opponent: 'Bob', player: 'Alice', result: 'win' });
    dbCtx.deleteMatch(matchId);
    expect(dbCtx.getMatchDetails(matchId)).toBeNull();
    const games = dbCtx.db.prepare('SELECT * FROM games WHERE match_id=?').all(matchId);
    expect(games).toHaveLength(0);
  });

  it('prevents duplicate source_file entries (upsert key)', () => {
    dbCtx.insertMatch({ final_result: '2-0', source_file: '/logs/Match_1.dat' });
    expect(() => {
      dbCtx.insertMatch({ final_result: '1-2', source_file: '/logs/Match_1.dat' });
    }).toThrow();
  });

  it('replaces tags on updateMatchMeta', () => {
    const matchId = dbCtx.insertMatch({ final_result: '2-0', tags: ['OldTag'] });
    dbCtx.updateMatchMeta(matchId, { tags: ['NewTag'] });
    const details = dbCtx.getMatchDetails(matchId);
    expect(details.tags).toContain('NewTag');
    expect(details.tags).not.toContain('OldTag');
  });
});
