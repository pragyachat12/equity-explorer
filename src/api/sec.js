const SEC_FACTS = '/sec/api/xbrl/companyfacts';
const SEC_TICKERS = '/sec-files/files/company_tickers.json';
const CORS = ''; // no longer needed

let tickerMap = null;

/**
 * Load SEC ticker → CIK map (cached).
 */
async function loadTickerMap() {
  if (tickerMap) return tickerMap;
  const res = await fetch(CORS + encodeURIComponent(SEC_TICKERS));
  if (!res.ok) throw new Error('Could not load SEC ticker list');
  const json = await res.json();
  tickerMap = {};
  Object.values(json).forEach(({ ticker, cik_str, title }) => {
    tickerMap[ticker.toUpperCase()] = {
      cik: String(cik_str).padStart(10, '0'),
      name: title,
    };
  });
  return tickerMap;
}

/**
 * Search companies by ticker prefix or name fragment.
 */
export async function searchCompanies(query, limit = 10) {
  const map = await loadTickerMap();
  const q = query.toUpperCase().trim();
  const results = [];

  // exact ticker match first
  if (map[q]) results.push({ symbol: q, name: map[q].name, cik: map[q].cik });

  // then prefix matches on ticker
  for (const [ticker, info] of Object.entries(map)) {
    if (results.length >= limit) break;
    if (ticker !== q && ticker.startsWith(q)) {
      results.push({ symbol: ticker, name: info.name, cik: info.cik });
    }
  }

  // then name matches
  if (results.length < limit) {
    const ql = query.toLowerCase();
    for (const [ticker, info] of Object.entries(map)) {
      if (results.length >= limit) break;
      if (!ticker.startsWith(q) && info.name.toLowerCase().includes(ql)) {
        results.push({ symbol: ticker, name: info.name, cik: info.cik });
      }
    }
  }

  return results.slice(0, limit);
}

/**
 * Get CIK for a ticker.
 */
export async function getCIK(ticker) {
  const map = await loadTickerMap();
  const entry = map[ticker.toUpperCase()];
  if (!entry) throw new Error(`Ticker ${ticker} not found in SEC database`);
  return entry.cik;
}

/**
 * Pull latest value for an XBRL concept from company facts.
 * concept: e.g. 'Revenues', 'NetIncomeLoss', 'EarningsPerShareBasic'
 */
function latestAnnual(facts, concept) {
  const ns = facts?.['us-gaap']?.[concept];
  if (!ns) return null;
  const units = ns.units?.USD || ns.units?.shares || ns.units?.['USD/shares'];
  if (!units) return null;
  // get 10-K annual filings only, sorted by end date desc
  const annual = units
    .filter(u => u.form === '10-K' && u.val != null)
    .sort((a, b) => new Date(b.end) - new Date(a.end));
  return annual[0]?.val ?? null;
}

function latestQuarter(facts, concept) {
  const ns = facts?.['us-gaap']?.[concept];
  if (!ns) return null;
  const units = ns.units?.USD || ns.units?.shares || ns.units?.['USD/shares'];
  if (!units) return null;
  const quarterly = units
    .filter(u => (u.form === '10-Q' || u.form === '10-K') && u.val != null)
    .sort((a, b) => new Date(b.end) - new Date(a.end));
  return quarterly[0]?.val ?? null;
}

/**
 * Get full fundamentals for a ticker from SEC EDGAR.
 */
export async function getSecFundamentals(ticker) {
  const cik = await getCIK(ticker);
  const url = `${SEC_FACTS}/CIK${cik}.json`;
  const res = await fetch(CORS + encodeURIComponent(url), {
    headers: { 'User-Agent': 'stock-fundamentals-dashboard contact@example.com' }
  });
  if (!res.ok) throw new Error(`SEC EDGAR HTTP ${res.status}`);
  const json = await res.json();
  const f = json.facts;

  const revenue = latestAnnual(f, 'Revenues')
    || latestAnnual(f, 'RevenueFromContractWithCustomerExcludingAssessedTax')
    || latestAnnual(f, 'SalesRevenueNet');

  const netIncome = latestAnnual(f, 'NetIncomeLoss');
  const grossProfit = latestAnnual(f, 'GrossProfit');
  const eps = latestQuarter(f, 'EarningsPerShareBasic')
    || latestQuarter(f, 'EarningsPerShareDiluted');
  const totalDebt = latestAnnual(f, 'LongTermDebt')
    || latestAnnual(f, 'LongTermDebtNoncurrent');
  const totalEquity = latestAnnual(f, 'StockholdersEquity')
    || latestAnnual(f, 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest');
  const totalAssets = latestAnnual(f, 'Assets');
  const shares = latestQuarter(f, 'CommonStockSharesOutstanding');
  const dividends = latestAnnual(f, 'DividendsCash')
    || latestAnnual(f, 'PaymentsOfDividendsCommonStock');

  const grossMargin = (revenue && grossProfit) ? grossProfit / revenue : null;
  const netMargin = (revenue && netIncome) ? netIncome / revenue : null;
  const debtToEquity = (totalDebt && totalEquity) ? totalDebt / totalEquity : null;
  const roe = (netIncome && totalEquity) ? netIncome / totalEquity : null;

  return {
    ticker: ticker.toUpperCase(),
    name: json.entityName,
    cik,
    revenue,
    netIncome,
    grossProfit,
    grossMargin,
    netMargin,
    eps,
    totalDebt,
    totalEquity,
    totalAssets,
    debtToEquity,
    roe,
    shares,
    dividends,
  };
}
