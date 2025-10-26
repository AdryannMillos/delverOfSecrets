const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'mtgo.db'));

// Matches table
db.prepare(`
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    date TEXT,
    format TEXT,
    deck TEXT,
    opponent TEXT,
    result TEXT,
    tags TEXT
)
`).run();

// Plays table
db.prepare(`
CREATE TABLE IF NOT EXISTS plays (
    id INTEGER PRIMARY KEY,
    match_id INTEGER,
    game_number INTEGER,
    player TEXT,
    card TEXT,
    occurrence INTEGER,
    FOREIGN KEY(match_id) REFERENCES matches(id)
)
`).run();

// Get match history with optional filters
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

// Get plays for a match
function getPlays(match_id) {
    return db.prepare('SELECT * FROM plays WHERE match_id = ?').all(match_id);
}

module.exports = { db, getMatches, getPlays };
