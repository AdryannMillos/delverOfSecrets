const fs = require('fs');

function formatData(filePath) {
  let gameCounter = 0;
  let currentGameKey = `game${gameCounter}`;

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  const userData = {};
  const gameMeta = {};
  const entryRegex = /@P([^\s]+) (?:casts|plays) @\[([^\@]+)@:/g;
  const winnerRegex = /@P([^\s]+) wins the game/;
  const mulliganRegex = /@P([^\s]+) mulligans/;

  for (let line of lines) {
    const parts = line.split(/(chooses to play first)/);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part === 'chooses to play first') {
        gameCounter++;
        currentGameKey = `game${gameCounter}`;
        continue;
      }

      const winnerMatch = winnerRegex.exec(part);
      if (winnerMatch) {
        if (!gameMeta[currentGameKey]) gameMeta[currentGameKey] = {};
        gameMeta[currentGameKey].winner = winnerMatch[1];
      }

      const mulliganMatch = mulliganRegex.exec(part);
      if (mulliganMatch) {
        if (!gameMeta[currentGameKey]) gameMeta[currentGameKey] = {};
        if (!gameMeta[currentGameKey].mulligans) gameMeta[currentGameKey].mulligans = {};
        const player = mulliganMatch[1];
        gameMeta[currentGameKey].mulligans[player] = (gameMeta[currentGameKey].mulligans[player] || 0) + 1;
      }

      entryRegex.lastIndex = 0;
      let match;
      while ((match = entryRegex.exec(part)) !== null) {
        const player = match[1];
        const cardName = match[2];

        if (!userData[player]) {
          userData[player] = {};
        }
        if (!userData[player][currentGameKey]) {
          userData[player][currentGameKey] = {};
        }
        userData[player][currentGameKey][cardName] = (userData[player][currentGameKey][cardName] || 0) + 1;
      }
    }
  }

  const result = Object.entries(userData).map(([userName, games]) => {
    const formattedGames = {};
    Object.entries(games).forEach(([gameKey, cards]) => {
      formattedGames[gameKey] = Object.entries(cards).map(([card, count]) => ({
        card,
        occurrence: count,
      }));
    });
    return { userName, ...formattedGames };
  });

  return { users: result, gameMeta };
}

module.exports = formatData;
