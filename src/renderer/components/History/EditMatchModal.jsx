import React, { useState } from 'react';
import TagInput from '../shared/TagInput';

export default function EditMatchModal({ match, onSave, onDelete, onClose }) {
  const [playerDeck, setPlayerDeck] = useState(match.player_deck || '');
  const [opponentDeck, setOpponentDeck] = useState(match.opponent_deck || '');
  const [notes, setNotes] = useState(match.notes || '');
  const [tags, setTags] = useState(match.tags || []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await window.electronAPI.updateMatch({ id: match.id, playerDeck, opponentDeck, notes, tags });
    setSaving(false);
    onSave();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this match? This cannot be undone.')) return;
    await window.electronAPI.deleteMatch(match.id);
    onDelete();
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>Edit Match</h3>

        <div className="form-group">
          <label>Your Deck (optional)</label>
          <input value={playerDeck} onChange={e => setPlayerDeck(e.target.value)} placeholder="e.g. Mono Red Burn" />
        </div>

        <div className="form-group">
          <label>Opponent's Deck (optional)</label>
          <input value={opponentDeck} onChange={e => setOpponentDeck(e.target.value)} placeholder="e.g. Azorius Control" />
        </div>

        <div className="form-group">
          <label>Categories / Tags</label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes about this match..." />
        </div>

        <div className="modal-actions">
          <button className="btn btn-danger" onClick={handleDelete}>Delete Match</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
