import React, { useState } from 'react';
import GameDetail from './GameDetail';
import EditMatchModal from './EditMatchModal';

function resultBadge(result) {
  const [pw = 0] = (result || '').split('-').map(Number);
  if (pw >= 2) return <span className="badge badge-win">{result} W</span>;
  if (pw === 0) return <span className="badge badge-loss">{result} L</span>;
  return <span className="badge badge-unknown">{result}</span>;
}

export default function MatchCard({ match, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const opponent = match.games?.[0]?.opponent || 'Unknown';
  const player = match.games?.[0]?.player || 'Unknown';
  const date = match.created_at ? new Date(match.created_at).toLocaleDateString() : '';

  return (
    <div className="match-card">
      <div className="match-card-header" onClick={() => setOpen(o => !o)}>
        <div>
          <div className="match-title">{player} vs {opponent}</div>
          <div className="match-meta" style={{ marginTop: 4 }}>
            {resultBadge(match.final_result)}
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

      {open && <GameDetail match={match} />}

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
