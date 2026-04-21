// renderer.js
import { renderHistoryTab } from './components/history.js';
import { renderReportsTab } from './components/report.js';

const tabContent = document.getElementById('tab-content');
const tabButtons = document.querySelectorAll('.tab-button');

function switchTab(tab) {
  tabButtons.forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  tabContent.innerHTML = '';
  if (tab === 'history') renderHistoryTab(tabContent);
  else if (tab === 'reports') renderReportsTab(tabContent);
}

// Add click listeners
tabButtons.forEach(button => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

// Initialize
switchTab('history');
