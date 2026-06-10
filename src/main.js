import { searchCompanies, getSecFundamentals } from './api/sec.js';
import { fetchPrice } from './api/yahoo.js';
import { renderCompareView, renderSingleCard, renderSearchResult } from './components/cards.js';

// --- DOM ---
const searchInput   = document.getElementById('search-input');
const searchBtn     = document.getElementById('search-btn');
const searchDrop    = document.getElementById('search-dropdown');
const companyPanel  = document.getElementById('company-panel');
const errorBar      = document.getElementById('error-bar');
const statusBadge   = document.getElementById('status-badge');
const compareBar    = document.getElementById('compare-bar');
const compareInput  = document.getElementById('compare-input');
const compareBtn    = document.getElementById('compare-btn');
const compareDrop   = document.getElementById('compare-dropdown');
const clearCompare  = document.getElementById('clear-compare');

if (statusBadge) statusBadge.style.display = 'none';

// state
let primaryData = null;   // { fundamentals, price }
let compareData = null;

function showError(msg) {
  errorBar.textContent = msg;
  errorBar.style.display = 'block';
  setTimeout(() => errorBar.style.display = 'none', 7000);
}

function setLoading(el, msg = 'loading…') {
  el.innerHTML = `<div class="loading-msg">${msg}</div>`;
}

// --- search helpers ---
function makeSearch(input, btn, drop, onSelect) {
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    const q = input.value.trim();
    if (!q) { drop.style.display = 'none'; return; }
    timeout = setTimeout(() => runSearch(q, drop, onSelect), 300);
  });
  btn.addEventListener('click', () => runSearch(input.value.trim(), drop, onSelect));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(input.value.trim(), drop, onSelect); });
}

async function runSearch(q, drop, onSelect) {
  if (!q) return;
  drop.innerHTML = '<div class="search-result no-result">searching…</div>';
  drop.style.display = 'block';
  try {
    const results = await searchCompanies(q, 8);
    if (!results.length) { drop.innerHTML = '<div class="search-result no-result">no results</div>'; return; }
    drop.innerHTML = results.map(renderSearchResult).join('');
    drop.querySelectorAll('.search-result[data-ticker]').forEach(el => {
      el.addEventListener('click', () => {
        onSelect(el.dataset.ticker);
        drop.style.display = 'none';
      });
    });
  } catch (e) { showError(e.message); drop.style.display = 'none'; }
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap') && !e.target.closest('.compare-bar'))  {
    searchDrop.style.display = 'none';
    compareDrop.style.display = 'none';
  }
});

// --- primary search ---
makeSearch(searchInput, searchBtn, searchDrop, async (ticker) => {
  searchInput.value = ticker;
  await loadPrimary(ticker);
});

// --- compare search ---
makeSearch(compareInput, compareBtn, compareDrop, async (ticker) => {
  compareInput.value = ticker;
  await loadCompare(ticker);
});

// --- clear compare ---
clearCompare.addEventListener('click', () => {
  compareData = null;
  compareInput.value = '';
  if (primaryData) renderPanel();
});

// --- load primary ---
async function loadPrimary(ticker) {
  setLoading(companyPanel, `fetching ${ticker} from SEC EDGAR…`);
  compareBar.style.display = 'flex';
  try {
    const [f, p] = await Promise.allSettled([getSecFundamentals(ticker), fetchPrice(ticker)]);
    if (f.status === 'rejected') throw new Error(f.reason?.message || 'SEC fetch failed');
    primaryData = { fundamentals: f.value, price: p.status === 'fulfilled' ? p.value : null };
    compareData = null;
    compareInput.value = '';
    renderPanel();
  } catch (e) {
    companyPanel.innerHTML = `<div class="loading-msg error">${e.message}</div>`;
  }
}

// --- load compare ---
async function loadCompare(ticker) {
  if (!primaryData) return;
  setLoading(companyPanel, `fetching ${ticker} for comparison…`);
  try {
    const [f, p] = await Promise.allSettled([getSecFundamentals(ticker), fetchPrice(ticker)]);
    if (f.status === 'rejected') throw new Error(f.reason?.message || 'SEC fetch failed');
    compareData = { fundamentals: f.value, price: p.status === 'fulfilled' ? p.value : null };
    renderPanel();
  } catch (e) {
    showError(e.message);
    renderPanel(); // revert to single
  }
}

// --- render ---
function renderPanel() {
  if (compareData) {
    companyPanel.innerHTML = renderCompareView(primaryData, compareData);
  } else {
    companyPanel.innerHTML = renderSingleCard(primaryData.fundamentals, primaryData.price);
  }
  // attach CSV export
  document.getElementById('export-csv')?.addEventListener('click', () => exportCSV());
}

// --- CSV export ---
function exportCSV() {
  const rows = [['metric', primaryData.fundamentals.ticker, compareData ? compareData.fundamentals.ticker : '']];
  const metrics = [
    ['price', primaryData.price?.price, compareData?.price?.price],
    ['market cap', primaryData.fundamentals.revenue, compareData?.fundamentals?.revenue],
    ['revenue', primaryData.fundamentals.revenue, compareData?.fundamentals?.revenue],
    ['net income', primaryData.fundamentals.netIncome, compareData?.fundamentals?.netIncome],
    ['gross margin', primaryData.fundamentals.grossMargin, compareData?.fundamentals?.grossMargin],
    ['net margin', primaryData.fundamentals.netMargin, compareData?.fundamentals?.netMargin],
    ['eps', primaryData.fundamentals.eps, compareData?.fundamentals?.eps],
    ['debt/equity', primaryData.fundamentals.debtToEquity, compareData?.fundamentals?.debtToEquity],
    ['roe', primaryData.fundamentals.roe, compareData?.fundamentals?.roe],
    ['total assets', primaryData.fundamentals.totalAssets, compareData?.fundamentals?.totalAssets],
  ];
  metrics.forEach(([label, a, b]) => rows.push([label, a ?? '', b ?? '']));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const tickers = compareData
    ? `${primaryData.fundamentals.ticker}_vs_${compareData.fundamentals.ticker}`
    : primaryData.fundamentals.ticker;
  a.href = url; a.download = `${tickers}_fundamentals.csv`;
  a.click(); URL.revokeObjectURL(url);
}
