import React from 'react';

export default function CardList({ cards = [], label }) {
  let parsed = cards;
  if (typeof cards === 'string') {
    try { parsed = JSON.parse(cards); } catch { parsed = []; }
  }

  return (
    <div className="player-col">
      {label && <h4>{label}</h4>}
      <ul>
        {parsed.map((c, i) => (
          <li key={i}>{c.card}{c.occurrence > 1 ? ` ×${c.occurrence}` : ''}</li>
        ))}
      </ul>
    </div>
  );
}
