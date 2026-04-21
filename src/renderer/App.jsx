import React, { useState } from 'react';
import HistoryTab from './components/History/HistoryTab';
import StatsTab from './components/Stats/StatsTab';
import LoginScreen from './components/Login/LoginScreen';

export default function App() {
  const [tab, setTab] = useState('history');
  const [username, setUsername] = useState(() => localStorage.getItem('mtgo_username') || '');

  const logout = () => {
    localStorage.removeItem('mtgo_username');
    setUsername('');
  };

  if (!username) return <LoginScreen onLogin={setUsername} />;

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
        <div className="user-chip">
          <strong>{username}</strong>
          <button onClick={logout}>Change username</button>
        </div>
      </nav>
      <main className="content">
        {tab === 'history' && <HistoryTab username={username} />}
        {tab === 'stats' && <StatsTab username={username} />}
      </main>
    </div>
  );
}
