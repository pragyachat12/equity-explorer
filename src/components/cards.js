import { fmt, fmtLarge, fmtPct, deltaClass } from './formatters.js';

let chartInstances = {};

function destroyCharts() {
  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};
}

export function renderCompanyCard(fundamentals, price) {
  destroyCharts();
  const f = fundamentals || {};
  const delta = price?.delta;
  const dc = deltaClass(delta);
  const priceNum = price?.price ? parseFloat(price.price) : null;
  const pe = (priceNum && f.eps) ? (priceNum / f.eps).toFixed(1) : '—';
  const pb = (priceNum && f.totalEquity && f.shares)
    ? (priceNum / (f.totalEquity / f.shares)).toFixed(2) : '—';
  const mktCap = (priceNum && f.shares) ? priceNum * f.shares : null;
  const divYield = (f.dividends && mktCap) ? (f.dividends / mktCap) : null;

  const html = `
    <div class="company-card">
      <div class="company-header">
        <div class="company-identity">
          <div>
            <div class="company-name">${f.name || f.ticker || '—'}</div>
            <div class="company-meta">
              <span class="ticker-badge">${f.ticker || '—'}</span>
              <span class="company-exchange">SEC · CIK ${f.cik || '—'}</span>
            </div>
          </div>
        </div>
        <div class="company-price-block">
          <div class="price-value">${price?.price ? '$' + price.price : '—'}</div>
          <div class="price-delta delta-${dc}">
            ${delta != null ? (delta >= 0 ? '+' : '') + delta + '%' : '—'}
          </div>
        </div>
      </div>

      <div class="fundamentals-grid">
        <div class="fund-item"><div class="fund-label">market cap</div><div class="fund-value">${fmtLarge(mktCap)}</div></div>
        <div class="fund-item"><div class="fund-label">p/e ratio</div><div class="fund-value">${pe}</div></div>
        <div class="fund-item"><div class="fund-label">p/b ratio</div><div class="fund-value">${pb}</div></div>
        <div class="fund-item"><div class="fund-label">eps (basic)</div><div class="fund-value">${fmt(f.eps)}</div></div>
        <div class="fund-item"><div class="fund-label">revenue</div><div class="fund-value">${fmtLarge(f.revenue)}</div></div>
        <div class="fund-item"><div class="fund-label">net income</div><div class="fund-value">${fmtLarge(f.netIncome)}</div></div>
        <div class="fund-item"><div class="fund-label">gross margin</div><div class="fund-value">${fmtPct(f.grossMargin)}</div></div>
        <div class="fund-item"><div class="fund-label">net margin</div><div class="fund-value">${fmtPct(f.netMargin)}</div></div>
        <div class="fund-item"><div class="fund-label">debt / equity</div><div class="fund-value">${fmt(f.debtToEquity)}</div></div>
        <div class="fund-item"><div class="fund-label">roe</div><div class="fund-value">${fmtPct(f.roe)}</div></div>
        <div class="fund-item"><div class="fund-label">total assets</div><div class="fund-value">${fmtLarge(f.totalAssets)}</div></div>
        <div class="fund-item"><div class="fund-label">dividend yield</div><div class="fund-value">${fmtPct(divYield)}</div></div>
      </div>

      <div class="charts-section">
        <div class="chart-card">
          <div class="chart-card-title">Revenue — 5 years</div>
          <div class="chart-card-sub">annual 10-K · USD</div>
          <div class="chart-wrap"><canvas id="chart-revenue" role="img" aria-label="Revenue over 5 years"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">Net Income — 5 years</div>
          <div class="chart-card-sub">annual 10-K · USD</div>
          <div class="chart-wrap"><canvas id="chart-netincome" role="img" aria-label="Net income over 5 years"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-title">EPS — 5 years</div>
          <div class="chart-card-sub">earnings per share · basic</div>
          <div class="chart-wrap"><canvas id="chart-eps" role="img" aria-label="EPS over 5 years"></canvas></div>
        </div>
      </div>

      <div class="sec-note">
        data sourced from SEC EDGAR 10-K/10-Q filings ·
        <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${f.cik}&type=10-K"
           target="_blank" rel="noopener">view filings ↗</a>
      </div>
    </div>
  `;

  // render HTML then draw charts after DOM updates
  setTimeout(() => {
    if (f.revenueHistory) drawBarChart('chart-revenue', f.revenueHistory, '#185FA5', v => '$' + (v/1e9).toFixed(1)+'B');
    if (f.netIncomeHistory) drawBarChart('chart-netincome', f.netIncomeHistory, '#0F6E56', v => '$' + (v/1e9).toFixed(1)+'B');
    if (f.epsHistory) drawBarChart('chart-eps', f.epsHistory, '#993C1D', v => '$' + Number(v).toFixed(2));
  }, 50);

  return html;
}

function drawBarChart(canvasId, { labels, values }, color, formatter) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // dynamic import Chart.js
  import('chart.js/auto').then(({ default: Chart }) => {
    if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: color + '33',
          borderColor: color,
          borderWidth: 1.5,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => formatter(ctx.parsed.y) } }
        },
        scales: {
          x: {
            ticks: { font: { size: 10, family: "'IBM Plex Mono', monospace" }, color: '#888780' },
            grid: { display: false },
            border: { display: false }
          },
          y: {
            ticks: { font: { size: 10, family: "'IBM Plex Mono', monospace" }, color: '#888780', callback: formatter },
            grid: { color: 'rgba(136,135,128,0.1)' },
            border: { display: false }
          }
        }
      }
    });
  });
}

export function renderSearchResult(item) {
  return `
    <div class="search-result" data-ticker="${item.symbol}">
      <span class="result-ticker">${item.symbol}</span>
      <span class="result-name">${item.name}</span>
    </div>
  `;
}
