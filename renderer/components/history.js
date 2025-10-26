import { formatData } from '../../formatData.js'; // if accessible in renderer, or fetch via IPC

export async function renderHistoryTab(container) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h2>Game History</h2>
      <button id="syncBtn">🔄 Sync Matches</button>
    </div>
    <div id="history-list">Loading...</div>
  `;
  container.appendChild(wrapper);

  const historyList = wrapper.querySelector('#history-list');

  async function loadHistory() {
    const matches = await window.electronAPI.getHistory();
    historyList.innerHTML = '';
    if (!matches.length) {
      historyList.textContent = 'No matches found.';
      return;
    }

    matches.forEach(match => {
      const acc = document.createElement('div');
      acc.className = 'accordion';
      acc.innerHTML = `
        <div class="accordion-header">
          ${match.deck} vs ${match.opponent} (${match.result}) — ${match.format}
        </div>
        <div class="accordion-content">
          <div class="tabs">
            <button class="tab active" data-tab="game1">Game 1</button>
            <button class="tab" data-tab="game2">Game 2</button>
            <button class="tab" data-tab="game3">Game 3</button>
            <button class="tab" data-tab="full">Full List</button>
          </div>
          <div class="tab-content"></div>
        </div>
      `;
      historyList.appendChild(acc);
    });

    document.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const acc = header.parentElement;
        acc.classList.toggle('open');
      });
    });
  }

  wrapper.querySelector('#syncBtn').addEventListener('click', async () => {
    console.log('🔄 Syncing files...');

    const files = await window.electronAPI.getAllGameLogs(); // IPC to main to get .dat list
    for (const file of files) {
      const data = formatData(file);
      await window.electronAPI.saveMatch(data);
    }

    await loadHistory();
  });

  loadHistory();
}
