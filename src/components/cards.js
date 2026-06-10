import { fmt, fmtLarge, fmtPct, deltaClass } from './formatters.js';

let chartInstances = {};

function destroyCharts() {
  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};
}

// --- derived metrics helper ---
function derive(f, price) {
  const priceNum = price?.price ? parseFloat(price.price) : null;
  const mktCap = (priceNum && f.shares) ? priceNum * f.shares : null;
  return {
    pe: (priceNum && f.eps) ? (priceNum / f.eps).toFixed(1) : null,
    pb: (priceNum && f.totalEquity && f.shares) ? (priceNum / (f.totalEquity / f.shares)).toFixed(2) : null,
    mktCap,
    divYield: (f.dividends && mktCap) ? f.dividends / mktCap : null,
    priceNum,
  };
}

const METRICS = [
  { label: 'market cap',    key: 'mktCap',       fmt: fmtLarge,                   higherBetter: true },
  { label: 'p/e ratio',     key: 'pe',            fmt: v => fmt(v, 1),             higherBetter: false },
  { label: 'p/b ratio',     key: 'pb',            fmt: v => fmt(v, 2),             higherBetter: false },
  { label: 'eps (basic)',   key: 'eps',           fmt: v => fmt(v, 2),             higherBetter: true },
  { label: 'revenue',       key: 'revenue',       fmt: fmtLarge,                   higherBetter: true },
  { label: 'net income',    key: 'netIncome',     fmt: fmtLarge,                   higherBetter: true },
  { label: 'gross margin',  key: 'grossMargin',   fmt: fmtPct,                     higherBetter: true },
  { label: 'net margin',    key: 'netMargin',     fmt: fmtPct,                     higherBetter: true },
  { label: 'debt / equity', key: 'debtToEquity',  fmt: v => fmt(v, 2),             higherBetter: false },
  { label: 'roe',           key: 'roe',           fmt: fmtPct,                     higherBetter: true },
  { label: 'total assets',  key: 'totalAssets',   fmt: fmtLarge,                   higherBetter: true },
  { label: 'dividend yield',key: 'divYield',      fmt: fmtPct,                     higherBetter: true },
];

// --- single card ---
export function renderSingleCard(f, price) {
  destroyCharts();
  const d = derive(f, price);
  const dc = deltaClass(price?.delta);

  const html = `
    <div class="company-card">
      <div class="company-header">
        <div>
          <div class="company-name">${f.name || f.ticker}</div>
          <div class="company-meta">
            <span class="ticker-badge">${f.ticker}</span>
            <span class="company-exchange">SEC · CIK ${f.cik}</span>
          </div>
        </div>
        <div class="company-price-block">
          <div class="price-value">${price?.price ? '$' + price.price : '—'}</div>
          <div class="price-delta delta-${dc}">${price?.delta != null ? (price.delta >= 0 ? '+' : '') + price.delta + '%' : '—'}</div>
        </div>
      </div>

      <div class="fundamentals-grid">
        ${METRICS.map(m => {
          const raw = m.key === 'mktCap' || m.key === 'pe' || m.key === 'pb' || m.key === 'divYield'
            ? d[m.key] : f[m.key === 'eps' ? 'eps' : m.key];
          return `<div class="fund-item">
            <div class="fund-label">${m.label}</div>
            <div class="fund-value">${raw != null ? m.fmt(raw) : '—'}</div>
          </div>`;
        }).join('')}
      </div>

      <div class="charts-section">
        <div class="chart-card">
          <div class="chart-card-title">Revenue — 5 years</div>
          <div class="chart-card-sub">annual 10-K · USD</div>
          <div class="chart-wrap"><canvas id="chart-revenue"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">Net Income — 5 years</div>
          <div class="chart-card-sub">annual 10-K · USD</div>
          <div class="chart-wrap"><canvas id="chart-netincome"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">EPS — 5 years</div>
          <div class="chart-card-sub">earnings per share · basic</div>
          <div class="chart-wrap"><canvas id="chart-eps"></canvas></div>
        </div>
      </div>

      <div class="card-actions">
        <button id="export-csv">↓ export csv</button>
        <a class="sec-link" href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${f.cik}&type=10-K" target="_blank" rel="noopener">view SEC filings ↗</a>
      </div>
    </div>
  `;

  setTimeout(() => {
    if (f.revenueHistory)   drawBarChart('chart-revenue',   f.revenueHistory,   '#185FA5', v => '$' + (v/1e9).toFixed(1)+'B');
    if (f.netIncomeHistory) drawBarChart('chart-netincome', f.netIncomeHistory, '#0F6E56', v => '$' + (v/1e9).toFixed(1)+'B');
    if (f.epsHistory)       drawBarChart('chart-eps',       f.epsHistory,       '#993C1D', v => '$' + Number(v).toFixed(2));
  }, 50);

  return html;
}

// --- compare view ---
export function renderCompareView({ fundamentals: f1, price: p1 }, { fundamentals: f2, price: p2 }) {
  destroyCharts();
  const d1 = derive(f1, p1);
  const d2 = derive(f2, p2);

  function getVal(m, f, d) {
    if (['mktCap','pe','pb','divYield'].includes(m.key)) return d[m.key];
    if (m.key === 'eps') return f.eps;
    return f[m.key];
  }

  function winClass(m, v1, v2) {
    if (v1 == null || v2 == null) return ['', ''];
    const n1 = parseFloat(v1), n2 = parseFloat(v2);
    if (isNaN(n1) || isNaN(n2) || n1 === n2) return ['', ''];
    const a1better = m.higherBetter ? n1 > n2 : n1 < n2;
    return a1better ? ['win', 'lose'] : ['lose', 'win'];
  }

  const rows = METRICS.map(m => {
    const v1 = getVal(m, f1, d1);
    const v2 = getVal(m, f2, d2);
    const [c1, c2] = winClass(m, v1, v2);
    return `
      <div class="compare-row">
        <div class="compare-val ${c1}">${v1 != null ? m.fmt(v1) : '—'}</div>
        <div class="compare-label">${m.label}</div>
        <div class="compare-val ${c2}">${v2 != null ? m.fmt(v2) : '—'}</div>
      </div>`;
  }).join('');

  const dc1 = deltaClass(p1?.delta);
  const dc2 = deltaClass(p2?.delta);

  const html = `
    <div class="compare-card">
      <div class="compare-header">
        <div class="compare-company">
          <div class="company-name">${f1.name || f1.ticker}</div>
          <div class="company-meta"><span class="ticker-badge">${f1.ticker}</span></div>
          <div class="price-value" style="margin-top:8px">${p1?.price ? '$'+p1.price : '—'}</div>
          <div class="price-delta delta-${dc1}">${p1?.delta != null ? (p1.delta>=0?'+':'')+p1.delta+'%' : '—'}</div>
        </div>
        <div class="compare-vs">vs</div>
        <div class="compare-company" style="text-align:right">
          <div class="company-name">${f2.name || f2.ticker}</div>
          <div class="company-meta" style="justify-content:flex-end"><span class="ticker-badge">${f2.ticker}</span></div>
          <div class="price-value" style="margin-top:8px">${p2?.price ? '$'+p2.price : '—'}</div>
          <div class="price-delta delta-${dc2}">${p2?.delta != null ? (p2.delta>=0?'+':'')+p2.delta+'%' : '—'}</div>
        </div>
      </div>

      <div class="compare-rows">${rows}</div>

      <div class="compare-charts">
        <div class="chart-card">
          <div class="chart-card-title">Revenue — 5 years</div>
          <div class="chart-card-sub">annual 10-K · USD</div>
          <div class="chart-wrap"><canvas id="chart-revenue"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">Net Income — 5 years</div>
          <div class="chart-card-sub">annual 10-K · USD</div>
          <div class="chart-wrap"><canvas id="chart-netincome"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">EPS — 5 years</div>
          <div class="chart-card-sub">earnings per share · basic</div>
          <div class="chart-wrap"><canvas id="chart-eps"></canvas></div>
        </div>
      </div>

      <div class="card-actions">
        <button id="export-csv">↓ export csv</button>
        <span class="compare-legend"><span class="win-dot"></span> better value &nbsp; <span class="lose-dot"></span> worse</span>
      </div>
    </div>
  `;

  setTimeout(() => {
    const rev1 = f1.revenueHistory, rev2 = f2.revenueHistory;
    const ni1  = f1.netIncomeHistory, ni2 = f2.netIncomeHistory;
    const eps1 = f1.epsHistory, eps2 = f2.epsHistory;
    if (rev1 || rev2)  drawDualChart('chart-revenue',   rev1, rev2, f1.ticker, f2.ticker, v => '$'+(v/1e9).toFixed(1)+'B');
    if (ni1 || ni2)    drawDualChart('chart-netincome', ni1,  ni2,  f1.ticker, f2.ticker, v => '$'+(v/1e9).toFixed(1)+'B');
    if (eps1 || eps2)  drawDualChart('chart-eps',       eps1, eps2, f1.ticker, f2.ticker, v => '$'+Number(v).toFixed(2));
  }, 50);

  return html;
}

function drawBarChart(canvasId, { labels, values }, color, formatter) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  import('chart.js/auto').then(({ default: Chart }) => {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: color+'33', borderColor: color, borderWidth: 1.5, borderRadius: 3 }] },
      options: chartOptions(formatter),
    });
  });
}

function drawDualChart(canvasId, series1, series2, label1, label2, formatter) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  import('chart.js/auto').then(({ default: Chart }) => {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const labels = series1?.labels || series2?.labels || [];
    const datasets = [];
    if (series1) datasets.push({ label: label1, data: series1.values, backgroundColor: '#185FA533', borderColor: '#185FA5', borderWidth: 1.5, borderRadius: 3 });
    if (series2) datasets.push({ label: label2, data: series2.values, backgroundColor: '#99381D33', borderColor: '#99381D', borderWidth: 1.5, borderRadius: 3 });
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets },
      options: { ...chartOptions(formatter), plugins: { legend: { display: true, labels: { font: { size: 10, family: "'Fira Code', monospace" }, color: '#96938d' } } } },
    });
  });
}

function chartOptions(formatter) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => formatter(ctx.parsed.y) } } },
    scales: {
      x: { ticks: { font: { size: 10, family: "'Fira Code', monospace" }, color: '#888780' }, grid: { display: false }, border: { display: false } },
      y: { ticks: { font: { size: 10, family: "'Fira Code', monospace" }, color: '#888780', callback: formatter }, grid: { color: 'rgba(136,135,128,0.1)' }, border: { display: false } }
    }
  };
}

export function renderSearchResult(item) {
  return `<div class="search-result" data-ticker="${item.symbol}">
    <span class="result-ticker">${item.symbol}</span>
    <span class="result-name">${item.name}</span>
  </div>`;
}
