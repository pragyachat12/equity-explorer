import { searchCompanies, getSecFundamentals } from './api/sec.js';
import { fetchPrice } from './api/yahoo.js';
import { renderCompanyCard, renderSearchResult } from './components/cards.js';
import { SECTORS } from './components/formatters.js';

// --- DOM ---
const searchInput  = document.getElementById('search-input');
const searchBtn    = document.getElementById('search-btn');
const searchDrop   = document.getElementById('search-dropdown');
const companyPanel = document.getElementById('company-panel');
const errorBar     = document.getElementById('error-bar');
const sectorSelect = document.getElementById('sector-select');
const screenBtn    = document.getElementById('screen-btn');
const screenerBody = document.getElementById('screener-body');
const tabBtns      = document.querySelectorAll('.tab-btn');
const tabPanels    = document.querySelectorAll('.tab-panel');
const statusBadge  = document.getElementById('status-badge');

// SEC needs no key — always connected
statusBadge.textContent = 'sec edgar · no key needed';
statusBadge.className = 'status-badge live';

// hide api bar — not needed anymore
document.querySelector('.api-bar').style.display = 'none';

// populate sectors
SECTORS.forEach(s => {
  const opt = document.createElement('option');
  opt.value = s; opt.textContent = s;
  sectorSelect.appendChild(opt);
});

// --- tabs ---
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

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
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === 'tab-lookup'));
  tabPanels.forEach(p => p.classList.toggle('active', p.id === 'tab-lookup'));
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

// --- screener: scan tickers from SEC list ---
screenBtn.addEventListener('click', async () => {
  const sector = sectorSelect.value;
  setLoading(screenerBody, 'loading SEC ticker list…');

  // For screener, we use a curated list of well-known tickers per sector
  // since bulk SEC pulls would hit rate limits
  const SECTOR_TICKERS = {
    'Technology': ['AAPL','MSFT','NVDA','GOOGL','META','AVGO','AMD','INTC','CRM','ORCL'],
    'Healthcare': ['JNJ','UNH','LLY','ABBV','MRK','TMO','ABT','DHR','BMY','AMGN'],
    'Financials': ['BRK-B','JPM','BAC','WFC','GS','MS','BLK','AXP','USB','PNC'],
    'Consumer Cyclical': ['AMZN','TSLA','HD','MCD','NKE','LOW','SBUX','TJX','BKNG','MAR'],
    'Industrials': ['GE','HON','UPS','CAT','DE','LMT','RTX','BA','MMM','EMR'],
    'Communication Services': ['GOOGL','META','NFLX','DIS','CMCSA','T','VZ','TMUS','EA','ATVI'],
    'Consumer Defensive': ['WMT','PG','KO','PEP','COST','PM','MO','CL','GIS','K'],
    'Energy': ['XOM','CVX','COP','EOG','SLB','MPC','PSX','VLO','OXY','HAL'],
    'Real Estate': ['AMT','PLD','CCI','EQIX','PSA','DLR','O','WELL','AVB','EQR'],
    'Basic Materials': ['LIN','APD','ECL','SHW','FCX','NEM','NUE','VMC','MLM','CF'],
    'Utilities': ['NEE','DUK','SO','D','AEP','EXC','SRE','PCG','XEL','ED'],
  };

  const tickers = sector ? (SECTOR_TICKERS[sector] || []) : Object.values(SECTOR_TICKERS).flat().slice(0, 20);

  if (!tickers.length) {
    screenerBody.innerHTML = '<div class="loading-msg">select a sector to screen</div>';
    return;
  }

  screenerBody.innerHTML = `<div class="loading-msg">fetching ${tickers.length} companies from SEC…</div>`;

  const results = [];
  for (const ticker of tickers.slice(0, 10)) {
    try {
      const f = await getSecFundamentals(ticker);
      results.push(f);
      screenerBody.innerHTML = `<div class="loading-msg">loaded ${results.length}/${Math.min(tickers.length,10)}…</div>`;
    } catch { /* skip failed tickers */ }
  }

  if (!results.length) {
    screenerBody.innerHTML = '<div class="loading-msg">no results</div>';
    return;
  }

  screenerBody.innerHTML = `
    <div class="screener-header">
      <span>ticker</span>
      <span>company</span>
      <span>revenue</span>
      <span>net margin</span>
      <span>debt/equity</span>
    </div>
    ${results.map(r => `
      <div class="screener-row" data-ticker="${r.ticker}">
        <span class="sr-ticker">${r.ticker}</span>
        <span class="sr-name">${r.name || '—'}</span>
        <span class="sr-rev">${r.revenue ? '$' + (r.revenue/1e9).toFixed(1)+'B' : '—'}</span>
        <span class="sr-margin">${r.netMargin ? (r.netMargin*100).toFixed(1)+'%' : '—'}</span>
        <span class="sr-de">${r.debtToEquity ? r.debtToEquity.toFixed(2) : '—'}</span>
      </div>
    `).join('')}
  `;

  screenerBody.querySelectorAll('.screener-row').forEach(el => {
    el.addEventListener('click', () => loadCompany(el.dataset.ticker));
  });
});
