import React, { useState, useEffect } from 'react';

const GAME_TABS = ['game1', 'game2', 'game3', 'full'];
const TAB_LABELS = { game1: 'G1', game2: 'G2', game3: 'G3', full: 'All' };

function CardList({ cards = [] }) {
  return (
    <ul className="card-list">
      {cards.map((c, i) => <li key={i}>{c.card}</li>)}
    </ul>
  );
}

function PlayerPanel({ player, gameKey, gameMeta, isFullView }) {
  const winner = gameMeta[gameKey]?.winner;
  const mulligans = gameMeta[gameKey]?.mulligans || {};
  const isWinner = player.userName === winner;

  const cards = isFullView
    ? Object.entries(
        ['game1', 'game2', 'game3'].flatMap(k => player[k] || []).reduce((acc, c) => {
          acc[c.card] = (acc[c.card] || 0) + 1;
          return acc;
        }, {})
      ).map(([card, count]) => ({ card, count }))
    : (player[gameKey] || []);

  return (
    <div className={`player-panel ${isWinner && !isFullView ? 'winner' : ''}`}>
      <div className="player-name">
        {player.userName}
        {!isFullView && winner && (isWinner ? ' 🏆' : ' 💀')}
      </div>
      {!isFullView && (
        <div className="mulligan">Mulligans: {mulligans[player.userName] || 0}</div>
      )}
      <CardList cards={isFullView ? cards.map(c => ({ card: `${c.card}${c.count > 1 ? ` ×${c.count}` : ''}` })) : cards} />
    </div>
  );
}

export default function OverlayApp() {
  const [users, setUsers] = useState([]);
  const [gameMeta, setGameMeta] = useState({});
  const [activeTab, setActiveTab] = useState('game1');

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onUpdateData((data) => {
      setUsers(data.data.users || []);
      setGameMeta(data.data.gameMeta || {});
    });
  }, []);

  const availableTabs = GAME_TABS.filter(t =>
    t === 'full' || users.some(u => u[t]?.length > 0)
  );

  const isFullView = activeTab === 'full';

  return (
    <div className="overlay">
      <div className="title-bar">
        <span className="overlay-title">🔍 Tireless Tracker</span>
        <div className="window-controls">
          <button onClick={() => window.electronAPI?.minimizeOverlay()}>−</button>
          <button onClick={() => window.electronAPI?.closeOverlay()}>×</button>
        </div>
      </div>

      <div className="tabs">
        {availableTabs.map(t => (
          <button
            key={t}
            className={`tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="players">
        {users.length === 0
          ? <div className="waiting">Waiting for game data…</div>
          : users.map(player => (
              <PlayerPanel
                key={player.userName}
                player={player}
                gameKey={activeTab}
                gameMeta={gameMeta}
                isFullView={isFullView}
              />
            ))
        }
      </div>
    </div>
  );
}
