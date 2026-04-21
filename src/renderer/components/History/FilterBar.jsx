import React, { useState } from 'react';

const RESULTS = ['', '2-0', '2-1', '1-2', '0-2'];

export default function FilterBar({ onFilter }) {
  const [filters, setFilters] = useState({
    fromDate: '', toDate: '', opponent: '', playerDeck: '', opponentDeck: '', result: '', tag: '',
  });

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const apply = () => onFilter(filters);
  const clear = () => {
    const empty = { fromDate: '', toDate: '', opponent: '', playerDeck: '', opponentDeck: '', result: '', tag: '' };
    setFilters(empty);
    onFilter(empty);
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>From</label>
        <input type="date" value={filters.fromDate} onChange={e => set('fromDate', e.target.value)} />
      </div>
      <div className="filter-group">
        <label>To</label>
        <input type="date" value={filters.toDate} onChange={e => set('toDate', e.target.value)} />
      </div>
      <div className="filter-group">
        <label>Opponent</label>
        <input placeholder="Opponent name" value={filters.opponent} onChange={e => set('opponent', e.target.value)} />
      </div>
      <div className="filter-group">
        <label>Your Deck</label>
        <input placeholder="Deck name" value={filters.playerDeck} onChange={e => set('playerDeck', e.target.value)} />
      </div>
      <div className="filter-group">
        <label>Opp. Deck</label>
        <input placeholder="Deck name" value={filters.opponentDeck} onChange={e => set('opponentDeck', e.target.value)} />
      </div>
      <div className="filter-group">
        <label>Result</label>
        <select value={filters.result} onChange={e => set('result', e.target.value)}>
          {RESULTS.map(r => <option key={r} value={r}>{r || 'Any'}</option>)}
        </select>
      </div>
      <div className="filter-group">
        <label>Tag</label>
        <input placeholder="Tag" value={filters.tag} onChange={e => set('tag', e.target.value)} />
      </div>
      <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
        <label>&nbsp;</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-primary" onClick={apply}>Filter</button>
          <button className="btn btn-secondary" onClick={clear}>Clear</button>
        </div>
      </div>
    </div>
  );
}
