import React, { useState, useEffect, useCallback } from 'react';
import FilterBar from './FilterBar';
import MatchCard from './MatchCard';

export default function HistoryTab({ username }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState({});

  const load = useCallback(async (f = filters) => {
    setLoading(true);
    const data = await window.electronAPI.getHistory({ ...f, playerName: username });
    setMatches(data);
    setLoading(false);
  }, [filters, username]);

  useEffect(() => { load(); }, [username]);

  const sync = async () => {
    setSyncing(true);
    const logs = await window.electronAPI.getAllGameLogs();
    for (const file of logs) {
      const parsed = await window.electronAPI.formatData(file);
      if (parsed.users.length >= 2) await window.electronAPI.saveMatch({ ...parsed, sourceFile: file });
    }
    await load();
    setSyncing(false);
  };

  const applyFilter = (f) => { setFilters(f); load(f); };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Match History</h2>
        <button className="btn btn-primary" onClick={sync} disabled={syncing}>
          {syncing ? 'Syncing…' : '↺ Sync Logs'}
        </button>
      </div>

      <FilterBar onFilter={applyFilter} />

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : matches.length === 0 ? (
        <div className="empty-state">No matches found. Try syncing your logs or adjusting filters.</div>
      ) : (
        <div className="match-list">
          {matches.map(m => (
            <MatchCard key={m.id} match={m} username={username} onRefresh={() => load()} />
          ))}
        </div>
      )}
    </div>
  );
}
