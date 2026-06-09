import { fmt, fmtLarge, fmtPct, deltaClass } from './formatters.js';

export function renderCompanyCard(fundamentals, price) {
  const f = fundamentals || {};
  const delta = price?.delta;
  const dc = deltaClass(delta);

  // calculate P/E and P/B from price + SEC data
  const priceNum = price?.price ? parseFloat(price.price) : null;
  const pe = (priceNum && f.eps) ? (priceNum / f.eps).toFixed(1) : '—';
  const pb = (priceNum && f.totalEquity && f.shares)
    ? (priceNum / (f.totalEquity / f.shares)).toFixed(2) : '—';
  const mktCap = (priceNum && f.shares) ? priceNum * f.shares : null;
  const divYield = (f.dividends && mktCap) ? (f.dividends / mktCap) : null;

  return `
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
        <div class="fund-item">
          <div class="fund-label">market cap</div>
          <div class="fund-value">${fmtLarge(mktCap)}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">p/e ratio</div>
          <div class="fund-value">${pe}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">p/b ratio</div>
          <div class="fund-value">${pb}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">eps (basic)</div>
          <div class="fund-value">${fmt(f.eps)}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">revenue</div>
          <div class="fund-value">${fmtLarge(f.revenue)}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">net income</div>
          <div class="fund-value">${fmtLarge(f.netIncome)}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">gross margin</div>
          <div class="fund-value">${fmtPct(f.grossMargin)}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">net margin</div>
          <div class="fund-value">${fmtPct(f.netMargin)}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">debt / equity</div>
          <div class="fund-value">${fmt(f.debtToEquity)}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">roe</div>
          <div class="fund-value">${fmtPct(f.roe)}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">total assets</div>
          <div class="fund-value">${fmtLarge(f.totalAssets)}</div>
        </div>
        <div class="fund-item">
          <div class="fund-label">dividend yield</div>
          <div class="fund-value">${fmtPct(divYield)}</div>
        </div>
      </div>

      <div class="sec-note">
        data sourced from SEC EDGAR 10-K/10-Q filings · 
        <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${f.cik}&type=10-K" 
           target="_blank" rel="noopener">view filings ↗</a>
      </div>
    </div>
  `;
}

export function renderSearchResult(item) {
  return `
    <div class="search-result" data-ticker="${item.symbol}">
      <span class="result-ticker">${item.symbol}</span>
      <span class="result-name">${item.name}</span>
    </div>
  `;
}

export function renderScreenerRow(stock) {
  return `
    <div class="screener-row" data-ticker="${stock.ticker}">
      <span class="sr-ticker">${stock.ticker}</span>
      <span class="sr-name">${stock.name || '—'}</span>
      <span class="sr-rev">${fmtLarge(stock.revenue)}</span>
      <span class="sr-margin">${fmtPct(stock.netMargin)}</span>
      <span class="sr-de">${fmt(stock.debtToEquity)}</span>
    </div>
  `;
}
