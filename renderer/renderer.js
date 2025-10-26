import { renderHistoryTab } from './components/history.js';
import { renderReportsTab } from './components/reports.js';

const tabContent = document.getElementById('tab-content');
const buttons = document.querySelectorAll('.tab-button');

function switchTab(tab) {
  buttons.forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  tabContent.innerHTML = '';
  if (tab === 'history') renderHistoryTab(tabContent);
  else if (tab === 'reports') renderReportsTab(tabContent);
}

buttons.forEach(button => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

// Default view
switchTab('history');
