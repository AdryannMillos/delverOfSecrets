import React, { useState } from 'react';
import CardList from '../shared/CardList';

const TABS = ['game1', 'game2', 'game3', 'full'];
const TAB_LABELS = { game1: 'Game 1', game2: 'Game 2', game3: 'Game 3', full: 'All Games' };

function GameView({ game, username }) {
  // Determine which DB field is "you" and which is "opponent"
  const youArePlayer = game.player === username;
  const yourCards   = youArePlayer ? game.player_cards   : game.opponent_cards;
  const oppCards    = youArePlayer ? game.opponent_cards  : game.player_cards;
  const yourMull    = youArePlayer ? game.player_mulligans : game.opponent_mulligans;
  const oppMull     = youArePlayer ? game.opponent_mulligans : game.player_mulligans;
  const oppName     = youArePlayer ? game.opponent : game.player;

  const resultColor = game.result === 'win'
    ? (youArePlayer ? 'var(--win)' : 'var(--loss)')
    : game.result === 'loss'
      ? (youArePlayer ? 'var(--loss)' : 'var(--win)')
      : 'inherit';

  const resultLabel = game.result === 'win'
    ? (youArePlayer ? 'Win' : 'Loss')
    : game.result === 'loss'
      ? (youArePlayer ? 'Loss' : 'Win')
      : 'Unknown';

  return (
    <div className="game-detail">
      <CardList cards={yourCards} label="You" />
      <CardList cards={oppCards} label={oppName} />
      <div style={{ width: '100%', fontSize: 12, color: 'var(--text-muted)' }}>
        Result: <strong style={{ color: resultColor }}>{resultLabel}</strong>
        &nbsp;·&nbsp;Mulligans: You ×{yourMull}, {oppName} ×{oppMull}
      </div>
    </div>
  );
}

export default function GameDetail({ match, username }) {
  const [activeTab, setActiveTab] = useState('game1');
  const games = match.games || [];

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
              <GameView game={g} username={username} />
            </div>
          ))
        : (() => {
            const idx = parseInt(activeTab.replace('game', '')) - 1;
            const game = games[idx];
            return game
              ? <GameView game={game} username={username} />
              : <div style={{ padding: 16, color: 'var(--text-muted)' }}>No data for this game.</div>;
          })()
      }
    </div>
  );
}
