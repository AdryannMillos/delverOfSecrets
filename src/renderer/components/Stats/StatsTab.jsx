import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js';
import usePagination from '../shared/usePagination';
import Pagination from '../shared/Pagination';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const PAGE_SIZE = 10;

function WinrateBar({ rate }) {
  const cls = rate >= 55 ? 'high' : rate < 40 ? 'low' : '';
  return (
    <div className="winrate-bar">
      <div className="bar-track"><div className={`bar-fill ${cls}`} style={{ width: `${rate}%` }} /></div>
      <span style={{ minWidth: 36, textAlign: 'right', fontSize: 12 }}>{rate}%</span>
    </div>
  );
}

function PaginatedTable({ title, children, page, totalPages, hasPrev, hasNext, setPage }) {
  return (
    <div className="stats-section">
      <h3>{title}</h3>
      {children}
      <Pagination page={page} totalPages={totalPages} hasPrev={hasPrev} hasNext={hasNext} setPage={setPage} />
    </div>
  );
}

export default function StatsTab({ username }) {
  const [stats, setStats] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    const data = await window.electronAPI.getStats({ fromDate: from, toDate: to, playerName: username });
    setStats(data);
  };

  useEffect(() => { load(); }, [username]);

  const oppPag     = usePagination(stats?.perOpponent   ?? [], PAGE_SIZE);
  const matchupPag = usePagination(stats?.perMatchup     ?? [], PAGE_SIZE);
  const myDeckPag  = usePagination(stats?.mostPlayedDecks ?? [], PAGE_SIZE);
  const oppDeckPag = usePagination(stats?.mostFacedDecks  ?? [], PAGE_SIZE);

  if (!stats) return <div className="empty-state">Loading stats…</div>;

  const chartData = {
    labels: oppPag.slice.map(o => o.name),
    datasets: [
      { label: 'Wins',   data: oppPag.slice.map(o => o.won),  backgroundColor: '#4caf7d' },
      { label: 'Losses', data: oppPag.slice.map(o => o.lost), backgroundColor: '#e05555' },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#e2e2f0' } } },
    scales: {
      x: { ticks: { color: '#888899' }, grid: { color: '#2e2e3e' } },
      y: { ticks: { color: '#888899' }, grid: { color: '#2e2e3e' } },
    },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Statistics</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          <button className="btn btn-primary" onClick={load}>Apply</button>
        </div>
      </div>

      {/* Overview */}
      <div className="stats-grid">
        <div className="stat-card"><div className="value">{stats.total}</div><div className="label">Total Matches</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--win)' }}>{stats.wins}</div><div className="label">Wins</div></div>
        <div className="stat-card"><div className="value" style={{ color: 'var(--loss)' }}>{stats.losses}</div><div className="label">Losses</div></div>
        <div className="stat-card"><div className="value">{stats.winRate}%</div><div className="label">Win Rate</div></div>
      </div>

      {/* Per-opponent */}
      {stats.perOpponent.length > 0 && (
        <PaginatedTable title="Results by Opponent" {...oppPag}>
          <table>
            <thead><tr><th>Opponent</th><th>Played</th><th>W</th><th>L</th><th>Win Rate</th></tr></thead>
            <tbody>
              {oppPag.slice.map(o => (
                <tr key={o.name}>
                  <td>{o.name}</td><td>{o.played}</td>
                  <td style={{ color: 'var(--win)' }}>{o.won}</td>
                  <td style={{ color: 'var(--loss)' }}>{o.lost}</td>
                  <td><WinrateBar rate={o.winRate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </PaginatedTable>
      )}

      {/* Deck matchups */}
      {stats.perMatchup.length > 0 && (
        <PaginatedTable title="Deck Matchups" {...matchupPag}>
          <table>
            <thead><tr><th>Your Deck</th><th>vs Opponent Deck</th><th>Played</th><th>W</th><th>L</th><th>Win Rate</th></tr></thead>
            <tbody>
              {matchupPag.slice.map((m, i) => (
                <tr key={i}>
                  <td>{m.playerDeck}</td><td>{m.opponentDeck}</td><td>{m.played}</td>
                  <td style={{ color: 'var(--win)' }}>{m.won}</td>
                  <td style={{ color: 'var(--loss)' }}>{m.lost}</td>
                  <td><WinrateBar rate={m.winRate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </PaginatedTable>
      )}

      {/* Most played decks */}
      {stats.mostPlayedDecks.length > 0 && (
        <PaginatedTable title="Your Most Played Decks" {...myDeckPag}>
          <table>
            <thead><tr><th>Deck</th><th>Matches</th></tr></thead>
            <tbody>
              {myDeckPag.slice.map(d => (
                <tr key={d.name}><td>{d.name}</td><td>{d.count}</td></tr>
              ))}
            </tbody>
          </table>
        </PaginatedTable>
      )}

      {/* Most faced decks */}
      {stats.mostFacedDecks.length > 0 && (
        <PaginatedTable title="Most Faced Opponent Decks" {...oppDeckPag}>
          <table>
            <thead><tr><th>Deck</th><th>Times Faced</th></tr></thead>
            <tbody>
              {oppDeckPag.slice.map(d => (
                <tr key={d.name}><td>{d.name}</td><td>{d.count}</td></tr>
              ))}
            </tbody>
          </table>
        </PaginatedTable>
      )}

      {/* Chart — shows current opponent page */}
      {stats.perOpponent.length > 0 && (
        <div className="stats-section">
          <h3>W/L by Opponent (current page)</h3>
          <div className="chart-wrap">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  );
}
