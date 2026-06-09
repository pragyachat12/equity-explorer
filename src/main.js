import { searchCompanies, getSecFundamentals } from './api/sec.js';
import { fetchPrice } from './api/yahoo.js';
import { renderCompanyCard, renderSearchResult } from './components/cards.js';

// --- DOM ---
const searchInput  = document.getElementById('search-input');
const searchBtn    = document.getElementById('search-btn');
const searchDrop   = document.getElementById('search-dropdown');
const companyPanel = document.getElementById('company-panel');
const errorBar     = document.getElementById('error-bar');
const statusBadge  = document.getElementById('status-badge');

statusBadge.textContent = 'sec edgar · no key needed';
statusBadge.className = 'status-badge live';

function showError(msg) {
  errorBar.textContent = msg;
  errorBar.style.display = 'block';
  setTimeout(() => errorBar.style.display = 'none', 7000);
}

function setLoading(el, msg = 'loading…') {
  el.innerHTML = `<div class="loading-msg">${msg}</div>`;
}

// --- search ---
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (q.length < 1) { searchDrop.style.display = 'none'; return; }
  searchTimeout = setTimeout(() => runSearch(q), 300);
});

searchBtn.addEventListener('click', () => runSearch(searchInput.value.trim()));
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(searchInput.value.trim()); });

async function runSearch(q) {
  if (!q) return;
  setLoading(searchDrop, 'searching…');
  searchDrop.style.display = 'block';
  try {
    const results = await searchCompanies(q, 8);
    if (!results.length) {
      searchDrop.innerHTML = '<div class="search-result no-result">no results found</div>';
      return;
    }
    searchDrop.innerHTML = results.map(renderSearchResult).join('');
    searchDrop.querySelectorAll('.search-result[data-ticker]').forEach(el => {
      el.addEventListener('click', () => {
        loadCompany(el.dataset.ticker);
        searchDrop.style.display = 'none';
        searchInput.value = el.dataset.ticker;
      });
    });
  } catch (e) {
    showError(e.message);
    searchDrop.style.display = 'none';
  }
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) searchDrop.style.display = 'none';
});

// --- load company ---
async function loadCompany(ticker) {
  setLoading(companyPanel, `fetching ${ticker} from SEC EDGAR…`);
  try {
    const [fundamentals, price] = await Promise.allSettled([
      getSecFundamentals(ticker),
      fetchPrice(ticker),
    ]);
    if (fundamentals.status === 'rejected') throw new Error(fundamentals.reason?.message || 'SEC fetch failed');
    companyPanel.innerHTML = renderCompanyCard(
      fundamentals.value,
      price.status === 'fulfilled' ? price.value : null
    );
  } catch (e) {
    companyPanel.innerHTML = `<div class="loading-msg error">${e.message}</div>`;
  }
}
