import React, { useState } from 'react';
import GameDetail from './GameDetail';
import EditMatchModal from './EditMatchModal';

function getOpponentName(match, username) {
  const game = match.games?.[0];
  if (!game) return 'Unknown';
  return game.player === username ? game.opponent : game.player;
}

function getUserResult(match, username) {
  const game = match.games?.[0];
  if (!game) return match.final_result;
  const [pw, ow] = (match.final_result || '0-0').split('-').map(Number);
  // final_result is stored as playerWins-opponentWins from the DB's "player" field perspective
  return game.player === username ? `${pw}-${ow}` : `${ow}-${pw}`;
}

function resultBadge(result) {
  const [w, l] = (result || '0-0').split('-').map(Number);
  if (w > l) return <span className="badge badge-win">{result} W</span>;
  if (w < l) return <span className="badge badge-loss">{result} L</span>;
  return <span className="badge badge-unknown">{result}</span>;
}

export default function MatchCard({ match, username, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const opponent = getOpponentName(match, username);
  const userResult = getUserResult(match, username);
  const date = match.created_at ? new Date(match.created_at).toLocaleDateString() : '';

  return (
    <div className="match-card">
      <div className="match-card-header" onClick={() => setOpen(o => !o)}>
        <div>
          <div className="match-title">You vs {opponent}</div>
          <div className="match-meta" style={{ marginTop: 4 }}>
            {resultBadge(userResult)}
            {match.player_deck && <span className="badge badge-deck">You: {match.player_deck}</span>}
            {match.opponent_deck && <span className="badge badge-deck">Opp: {match.opponent_deck}</span>}
            {(match.tags || []).map(t => <span key={t} className="badge badge-tag">{t}</span>)}
            {date && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{date}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12, padding: '5px 10px' }}
            onClick={e => { e.stopPropagation(); setEditing(true); }}
          >
            Edit
          </button>
          <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>

      {open && <GameDetail match={match} username={username} />}

      {editing && (
        <EditMatchModal
          match={match}
          onSave={() => { setEditing(false); onRefresh(); }}
          onDelete={() => { setEditing(false); onRefresh(); }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
