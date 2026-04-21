const electronAPI = window.electronAPI;

export function renderHistoryTab(container) {
  container.innerHTML = `
    <div class="header">
      <h2>Game History</h2>
      <button id="syncBtn">🔄 Sync Matches</button>
    </div>
    <div id="history-list">Loading...</div>
  `;

  const historyList = container.querySelector("#history-list");

  async function loadHistory() {
    const matches = await electronAPI.getHistory();
    historyList.innerHTML = "";
    if (!matches.length) {
      historyList.textContent = "No matches found.";
      return;
    }

    for (const match of matches) {
      const acc = document.createElement("div");
      acc.className = "accordion";
      console.log(match);
      acc.innerHTML = `
        <div class="accordion-header">
          ${
            match?.games[0]?.player +
            " vs " +
            match?.games[0]?.opponent +
            " - " +
            match?.final_result
          }
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

      const header = acc.querySelector(".accordion-header");
      const tabButtons = acc.querySelectorAll(".tab");
      const tabContent = acc.querySelector(".tab-content");

      // Accordion toggle
      header.addEventListener("click", () => acc.classList.toggle("open"));

      function renderTab(tab) {
        tabContent.innerHTML = "";
        const games = match.games;
        if (tab === "full") {
          for (const game of games) {
            const div = document.createElement("div");

            const playerCards = JSON.parse(game.player_cards)
              .map((c) => `<li>${c.card} (x${c.occurrence})</li>`)
              .join("");

            const opponentCards = JSON.parse(game.opponent_cards)
              .map((c) => `<li>${c.card} (x${c.occurrence})</li>`)
              .join("");

            div.innerHTML = `
      <strong>${game.player} vs ${game.opponent}</strong>
      <p>Result: ${game.result}</p>
      <div>
        <p>${game.player} Cards:</p>
        <ul>${playerCards}</ul>
      </div>
      <div>
        <p>${game.opponent} Cards:</p>
        <ul>${opponentCards}</ul>
      </div>
      <p>Mulligans — ${game.player}: ${game.player_mulligans}, ${game.opponent}: ${game.opponent_mulligans}</p>
    `;

            tabContent.appendChild(div);
          }
          return;
        }

        const index = tab.replace("game", "") - 1;
        if (!Array.isArray(games) || games.length === 0) return;
        const game = games[index];
        if (!game) return;

        const div = document.createElement("div");

        const playerCards = JSON.parse(game.player_cards)
          .map((c) => `<li>${c.card} (x${c.occurrence})</li>`)
          .join("");

        const opponentCards = JSON.parse(game.opponent_cards)
          .map((c) => `<li>${c.card} (x${c.occurrence})</li>`)
          .join("");

        div.innerHTML = `
  <strong>${game.player} vs ${game.opponent}</strong>
  <p>Result: ${game.result}</p>
  <div>
    <p>${game.player} Cards:</p>
    <ul>${playerCards}</ul>
  </div>
  <div>
    <p>${game.opponent} Cards:</p>
    <ul>${opponentCards}</ul>
  </div>
  <p>Mulligans — ${game.player}: ${game.player_mulligans}, ${game.opponent}: ${game.opponent_mulligans}</p>
`;

        tabContent.appendChild(div);
      }

      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          tabButtons.forEach((b) => b.classList.remove("active"));
          button.classList.add("active");
          renderTab(button.dataset.tab);
        });
      });

      renderTab("game1");
    }
  }

  // Sync button
  container.querySelector("#syncBtn").addEventListener("click", async () => {
    const logs = await electronAPI.getAllGameLogs();
    for (const file of logs) {
      console.log("🚀 ~ renderHistoryTab ~ file:", file);
      const parsed = await electronAPI.formatData(file);
      if (parsed.users.length < 1) continue;
      console.log("🚀 ~ renderHistoryTab ~ parsed:", parsed);
      await electronAPI.saveMatch(parsed);
    }
    await loadHistory();
  });

  loadHistory();
}
