export async function renderReportsTab(container) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <h2>Reports</h2>
    <div>
      <label>From: <input type="date" id="fromDate"></label>
      <label>To: <input type="date" id="toDate"></label>
      <button id="generateReport">Generate</button>
    </div>
    <canvas id="winRateChart"></canvas>
    <div id="rivalStats"></div>
  `;
  container.appendChild(wrapper);

  const ctx = wrapper.querySelector('#winRateChart').getContext('2d');
  const rivalStats = wrapper.querySelector('#rivalStats');

  wrapper.querySelector('#generateReport').addEventListener('click', async () => {
    const from = wrapper.querySelector('#fromDate').value;
    const to = wrapper.querySelector('#toDate').value;

    const history = await window.electronAPI.getHistory();
    const filtered = history.filter(m => (!from || m.date >= from) && (!to || m.date <= to));

    const winCount = filtered.filter(m => m.result === 'win').length;
    const lossCount = filtered.filter(m => m.result === 'loss').length;

    // Winrate chart
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Wins', 'Losses'],
        datasets: [{
          data: [winCount, lossCount]
        }]
      }
    });

    // Rivals
    const rivalMap = {};
    filtered.forEach(m => {
      rivalMap[m.opponent] ??= { total: 0, wins: 0, losses: 0 };
      rivalMap[m.opponent].total++;
      if (m.result === 'win') rivalMap[m.opponent].wins++;
      else rivalMap[m.opponent].losses++;
    });

    const rivals = Object.entries(rivalMap).map(([name, data]) => ({ name, ...data }));
    rivals.sort((a, b) => b.total - a.total);

    const topRival = rivals[0]?.name || 'N/A';
    const mostWins = rivals.sort((a, b) => b.wins - a.wins)[0]?.name || 'N/A';
    const mostLosses = rivals.sort((a, b) => b.losses - a.losses)[0]?.name || 'N/A';

    rivalStats.innerHTML = `
      <h3>Rival Stats</h3>
      <p>Most played against: ${topRival}</p>
      <p>Most wins vs: ${mostWins}</p>
      <p>Most losses vs: ${mostLosses}</p>
    `;
  });
}
