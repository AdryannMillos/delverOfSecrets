import React, { useState } from 'react';
import HistoryTab from './components/History/HistoryTab';
import StatsTab from './components/Stats/StatsTab';

export default function App() {
  const [tab, setTab] = useState('history');

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo">🔍 Tireless Tracker</div>
        <button
          className={`nav-btn ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          History
        </button>
        <button
          className={`nav-btn ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => setTab('stats')}
        >
          Statistics
        </button>
      </nav>
      <main className="content">
        {tab === 'history' && <HistoryTab />}
        {tab === 'stats' && <StatsTab />}
      </main>
    </div>
  );
}
