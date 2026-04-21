const electronAPI = window.electronAPI;

export function renderReportsTab(container) {
  container.innerHTML = `
    <h2>Reports</h2>
    <div>
      <label>From: <input type="date" id="fromDate"></label>
      <label>To: <input type="date" id="toDate"></label>
      <button id="generateReport">Generate</button>
    </div>
    <div id="reportResults"></div>
  `;

  async function generateReport() {
    const from = container.querySelector('#fromDate').value;
    const to = container.querySelector('#toDate').value;

    const matches = await electronAPI.getHistory({ fromDate: from, toDate: to });
    const results = {
      winPercent: 0,
      biggestRival: null,
      mostLostAgainst: null,
      mostWonAgainst: null
    };

    // Compute statistics
    if (matches.length) {
      const wins = matches.filter(m => m.final_result === 'win').length;
      results.winPercent = Math.round((wins / matches.length) * 100);

      const opponentsCount = {};
      matches.forEach(m => {
        m.games.forEach(g => {
          opponentsCount[g.opponent] = (opponentsCount[g.opponent] || 0) + 1;
        });
      });

      results.biggestRival = Object.entries(opponentsCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
      // For most lost/won against, could analyze each game
    }

    const reportDiv = container.querySelector('#reportResults');
    reportDiv.innerHTML = `
      <p>Win %: ${results.winPercent}%</p>
      <p>Biggest Rival: ${results.biggestRival}</p>
    `;
  }

  container.querySelector('#generateReport').addEventListener('click', generateReport);
}
