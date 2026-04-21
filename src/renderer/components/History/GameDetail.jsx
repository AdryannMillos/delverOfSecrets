import React, { useState } from 'react';
import CardList from '../shared/CardList';

const TABS = ['game1', 'game2', 'game3', 'full'];
const TAB_LABELS = { game1: 'Game 1', game2: 'Game 2', game3: 'Game 3', full: 'All Games' };

export default function GameDetail({ match }) {
  const [activeTab, setActiveTab] = useState('game1');
  const games = match.games || [];

  const renderGame = (game) => (
    <div className="game-detail">
      <CardList cards={game.player_cards} label={`${game.player} (you)`} />
      <CardList cards={game.opponent_cards} label={game.opponent} />
      <div style={{ width: '100%', fontSize: 12, color: 'var(--text-muted)' }}>
        Result: <strong style={{ color: game.result === 'win' ? 'var(--win)' : game.result === 'loss' ? 'var(--loss)' : 'inherit' }}>{game.result}</strong>
        &nbsp;·&nbsp;Mulligans: {game.player} ×{game.player_mulligans}, {game.opponent} ×{game.opponent_mulligans}
      </div>
    </div>
  );

  const visibleTabs = TABS.filter(t => t === 'full' || games[parseInt(t.replace('game', '')) - 1]);

  return (
    <div className="match-card-body">
      <div className="inner-tabs">
        {visibleTabs.map(t => (
          <button
            key={t}
            className={`inner-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {activeTab === 'full'
        ? games.map((g, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>Game {i + 1}</div>
              {renderGame(g)}
            </div>
          ))
        : (() => {
            const idx = parseInt(activeTab.replace('game', '')) - 1;
            const game = games[idx];
            return game ? renderGame(game) : <div style={{ padding: 16, color: 'var(--text-muted)' }}>No data for this game.</div>;
          })()
      }
    </div>
  );
}
