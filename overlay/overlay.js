// overlay.js
const tabContent = document.getElementById('tabContent');
let currentData = [];
let gameMeta = {};

function renderTab(tab) {
  tabContent.innerHTML = '';

  if (tab === 'full') {
    currentData.forEach(player => {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player';

      const name = document.createElement('h3');
      name.textContent = player.userName;
      playerDiv.appendChild(name);

      const cardList = document.createElement('ul');
      const allCards = {};
      ['game1', 'game2', 'game3'].forEach(key => {
        (player[key] || []).forEach(card => {
          allCards[card.card] = (allCards[card.card] || 0) + 1;
        });
      });

      Object.entries(allCards).forEach(([card, occurrence]) => {
        const li = document.createElement('li');
        li.textContent = `${card} (${occurrence})`;
        cardList.appendChild(li);
      });

      playerDiv.appendChild(cardList);
      tabContent.appendChild(playerDiv);
    });
    return;
  }

  const winner = gameMeta[tab]?.winner;
  const mulligans = gameMeta[tab]?.mulligans || {};

  currentData.forEach(player => {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player';

    const name = document.createElement('h3');
    name.textContent = player.userName;
    name.textContent += player.userName === winner ? ' 🏆' : ' 😢';
    playerDiv.appendChild(name);

    const mulliganInfo = document.createElement('div');
    mulliganInfo.className = 'mulligan';
    mulliganInfo.textContent = `Mulligans: ${mulligans[player.userName] || 0}`;
    playerDiv.appendChild(mulliganInfo);

    const cardList = document.createElement('ul');
    (player[tab] || []).forEach(card => {
      const li = document.createElement('li');
      li.textContent = `${card.card}`;
      cardList.appendChild(li);
    });
    playerDiv.appendChild(cardList);

    tabContent.appendChild(playerDiv);
  });
}

document.querySelectorAll('.tab').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    renderTab(button.dataset.tab);
  });
});

if (window.electronAPI) {
  window.electronAPI.onUpdateData((data) => {
    console.log(data)
    currentData = data.data.users || [];
    gameMeta = data.data.gameMeta || {};
    const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'game1';
    renderTab(activeTab);
  });
}

document.getElementById('close')?.addEventListener('click', () => {
  window.electronAPI.closeOverlay?.();
});
document.getElementById('minimize')?.addEventListener('click', () => {
  window.electronAPI.minimizeOverlay?.();
});
document.getElementById('maximize')?.addEventListener('click', () => {
  window.electronAPI.maximizeOverlay?.();
});

renderTab('game1');
