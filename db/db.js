const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'mtgo.db'));
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
    match_tags TEXT,
    player_tags TEXT,
    opponent_tags TEXT,
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

function insertTag(name) {
    const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
    if (existing) return existing.id;
    const info = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
    return info.lastInsertRowid;
}

function linkTagToMatch(matchId, tagName) {
    const tagId = insertTag(tagName);
    db.prepare('INSERT OR IGNORE INTO match_tags (match_id, tag_id) VALUES (?, ?)').run(matchId, tagId);
}

function insertGame(game) {
    const stmt = db.prepare(`
        INSERT INTO games (
            match_id,
            opponent,
            player,
            opponent_cards,
            player_cards,
            opponent_mulligans,
            player_mulligans,
            result
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
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
    const stmt = db.prepare(`
        INSERT INTO matches (
            game1_id, game2_id, game3_id,
            final_result,
            match_tags,
            player_tags,
            opponent_tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
        match.game1_id || null,
        match.game2_id || null,
        match.game3_id || null,
        match.final_result || '',
        JSON.stringify(match.match_tags || []),
        JSON.stringify(match.player_tags || []),
        JSON.stringify(match.opponent_tags || [])
    );

    if (Array.isArray(match.match_tags)) {
        for (const t of match.match_tags) linkTagToMatch(info.lastInsertRowid, t);
    }

    return info.lastInsertRowid;
}

function getMatches(filters = {}) {
    let sql = 'SELECT * FROM matches';
    const params = [];

    if (Object.keys(filters).length > 0) {
        sql += ' WHERE ' + Object.keys(filters).map(f => {
            params.push(filters[f]);
            return `${f} = ?`;
        }).join(' AND ');
    }

    return db.prepare(sql).all(...params);
}

function getMatchDetails(matchId) {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) return null;

    const games = db.prepare('SELECT * FROM games WHERE match_id = ?').all(matchId);
    const tags = db.prepare(`
        SELECT t.name FROM tags t
        JOIN match_tags mt ON mt.tag_id = t.id
        WHERE mt.match_id = ?
    `).all(matchId).map(r => r.name);

    return { ...match, games, tags };
}

module.exports = {
    db,
    insertGame,
    insertMatch,
    insertTag,
    getMatches,
    getMatchDetails,
};
