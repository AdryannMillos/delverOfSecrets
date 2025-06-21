const fs = require('fs');



function formatData(filePath) {
  let gameCounter = 0;
let currentGameKey = 'game1';
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n');
  const userData = {};
  
  const entryRegex = /@P([^\s]+) (?:casts|plays) @\[([^\@]+)@:/g;

  for (let line of lines) {
    if (line.includes('chooses to play first')) {
      gameCounter++;
      currentGameKey = `game${gameCounter}`;
    }

    let match;
    while ((match = entryRegex.exec(line)) !== null) {
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

  return result;
}

module.exports = formatData;