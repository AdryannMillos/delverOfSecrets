import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

/**
 * Integration tests for IPC handler logic against a real in-memory SQLite DB.
 * We extract the handler logic into testable functions rather than mocking ipcMain.
 */

function buildHandlers(db) {
  // Replicate the exact DB functions from db.js against the given instance
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
    match_id INTEGER, tag_id INTEGER, PRIMARY KEY (match_id, tag_id),
    FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`).run();

  const insertTag = (name) => {
    const ex = db.prepare('SELECT id FROM tags WHERE name=?').get(name);
    if (ex) return ex.id;
    return db.prepare('INSERT INTO tags (name) VALUES (?)').run(name).lastInsertRowid;
  };
  const linkTag = (mid, name) => {
    const tid = insertTag(name);
    db.prepare('INSERT OR IGNORE INTO match_tags (match_id,tag_id) VALUES (?,?)').run(mid, tid);
  };

  const insertGame = (g) => db.prepare(
    'INSERT INTO games (match_id,opponent,player,opponent_cards,player_cards,opponent_mulligans,player_mulligans,result) VALUES (?,?,?,?,?,?,?,?)'
  ).run(g.match_id||null,g.opponent||'',g.player||'',
    JSON.stringify(g.opponent_cards||[]),JSON.stringify(g.player_cards||[]),
    g.opponent_mulligans||0,g.player_mulligans||0,g.result||'').lastInsertRowid;

  const insertMatch = (m) => {
    const id = db.prepare(
      'INSERT INTO matches (game1_id,game2_id,game3_id,final_result,source_file) VALUES (?,?,?,?,?)'
    ).run(m.game1_id||null,m.game2_id||null,m.game3_id||null,m.final_result||'',m.source_file||null).lastInsertRowid;
    if (Array.isArray(m.tags)) m.tags.forEach(t=>linkTag(id,t));
    return id;
  };

  const getMatchDetails = (id) => {
    const match = db.prepare('SELECT * FROM matches WHERE id=?').get(id);
    if (!match) return null;
    const games = db.prepare('SELECT * FROM games WHERE match_id=? ORDER BY id').all(id);
    const tags = db.prepare(
      'SELECT t.name FROM tags t JOIN match_tags mt ON mt.tag_id=t.id WHERE mt.match_id=?'
    ).all(id).map(r=>r.name);
    return { ...match, games, tags };
  };

  const upsertMatch = (sourceFile, { users, gameMeta }) => {
    if (!Array.isArray(users) || users.length < 2) return null;
    const [opponent, player] = users;
    const pw = Object.values(gameMeta).filter(g=>g.winner===player.userName).length;
    const ow = Object.values(gameMeta).filter(g=>g.winner===opponent.userName).length;
    const final_result = `${pw}-${ow}`;

    const existing = db.prepare('SELECT id FROM matches WHERE source_file=?').get(sourceFile);
    if (existing) {
      db.prepare('DELETE FROM games WHERE match_id=?').run(existing.id);
      const ids = [];
      for (let i=1;i<=3;i++){
        const gk=`game${i}`;
        if(!gameMeta[gk]) continue;
        const m=gameMeta[gk]?.mulligans||{};
        const r=gameMeta[gk]?.winner?(gameMeta[gk].winner===player.userName?'win':'loss'):'unknown';
        ids.push(insertGame({match_id:existing.id,opponent:opponent.userName,player:player.userName,
          opponent_cards:opponent[gk]||[],player_cards:player[gk]||[],
          opponent_mulligans:m[opponent.userName]||0,player_mulligans:m[player.userName]||0,result:r}));
      }
      db.prepare('UPDATE matches SET game1_id=?,game2_id=?,game3_id=?,final_result=? WHERE id=?')
        .run(ids[0]||null,ids[1]||null,ids[2]||null,final_result,existing.id);
      return existing.id;
    }

    const ids = [];
    for (let i=1;i<=3;i++){
      const gk=`game${i}`;
      if(!gameMeta[gk]) continue;
      const m=gameMeta[gk]?.mulligans||{};
      const r=gameMeta[gk]?.winner?(gameMeta[gk].winner===player.userName?'win':'loss'):'unknown';
      ids.push(insertGame({match_id:null,opponent:opponent.userName,player:player.userName,
        opponent_cards:opponent[gk]||[],player_cards:player[gk]||[],
        opponent_mulligans:m[opponent.userName]||0,player_mulligans:m[player.userName]||0,result:r}));
    }
    const mid = insertMatch({ game1_id:ids[0]||null,game2_id:ids[1]||null,game3_id:ids[2]||null,
      final_result, source_file:sourceFile });
    ids.forEach(gid=>db.prepare('UPDATE games SET match_id=? WHERE id=?').run(mid,gid));
    return mid;
  };

  const updateMatchMeta = (id,{playerDeck,opponentDeck,notes,tags}={}) => {
    db.prepare('UPDATE matches SET player_deck=?,opponent_deck=?,notes=? WHERE id=?')
      .run(playerDeck||null,opponentDeck||null,notes||null,id);
    if(Array.isArray(tags)){
      db.prepare('DELETE FROM match_tags WHERE match_id=?').run(id);
      tags.forEach(t=>linkTag(id,t));
    }
  };

  const deleteMatch = (id) => db.prepare('DELETE FROM matches WHERE id=?').run(id);

  return { upsertMatch, updateMatchMeta, deleteMatch, getMatchDetails, insertMatch, insertGame };
}

const SAMPLE_PARSED = {
  users: [
    { userName: 'Bob', game1: [{ card: 'Counterspell', occurrence: 1 }] },
    { userName: 'Alice', game1: [{ card: 'Lightning Bolt', occurrence: 2 }] },
  ],
  gameMeta: {
    game1: { winner: 'Alice', mulligans: { Alice: 0, Bob: 1 } },
  },
};

describe('IPC handler logic (integration)', () => {
  let handlers;
  beforeEach(() => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    handlers = buildHandlers(db);
  });

  it('upsertMatch inserts a new match and its games', () => {
    const id = handlers.upsertMatch('/log/Match_1.dat', SAMPLE_PARSED);
    expect(id).toBeGreaterThan(0);
    const details = handlers.getMatchDetails(id);
    expect(details.final_result).toBe('1-0');
    expect(details.games).toHaveLength(1);
    expect(details.games[0].result).toBe('win');
  });

  it('upsertMatch updates an existing match on re-parse', () => {
    const id = handlers.upsertMatch('/log/Match_1.dat', SAMPLE_PARSED);

    const updated = {
      users: [
        { userName: 'Bob', game1: [{ card: 'Counterspell', occurrence: 1 }], game2: [{ card: 'Cancel', occurrence: 1 }] },
        { userName: 'Alice', game1: [{ card: 'Lightning Bolt', occurrence: 2 }], game2: [{ card: 'Goblin Guide', occurrence: 3 }] },
      ],
      gameMeta: {
        game1: { winner: 'Alice', mulligans: {} },
        game2: { winner: 'Bob', mulligans: {} },
      },
    };
    const id2 = handlers.upsertMatch('/log/Match_1.dat', updated);
    expect(id2).toBe(id);
    const details = handlers.getMatchDetails(id);
    expect(details.final_result).toBe('1-1');
    expect(details.games).toHaveLength(2);
  });

  it('updateMatchMeta saves deck names, notes, and tags', () => {
    const id = handlers.upsertMatch('/log/Match_2.dat', SAMPLE_PARSED);
    handlers.updateMatchMeta(id, { playerDeck: 'Burn', opponentDeck: 'UW Control', notes: 'GGs', tags: ['League'] });
    const details = handlers.getMatchDetails(id);
    expect(details.player_deck).toBe('Burn');
    expect(details.opponent_deck).toBe('UW Control');
    expect(details.notes).toBe('GGs');
    expect(details.tags).toContain('League');
  });

  it('deleteMatch removes the record', () => {
    const id = handlers.upsertMatch('/log/Match_3.dat', SAMPLE_PARSED);
    handlers.deleteMatch(id);
    expect(handlers.getMatchDetails(id)).toBeNull();
  });
});
