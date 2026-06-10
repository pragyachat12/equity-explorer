const SEC_FACTS = 'https://api.allorigins.win/raw?url=https://data.sec.gov/api/xbrl/companyfacts';
import tickerData from '../data/tickers.json';

let tickerMap = null;

async function loadTickerMap() {
  if (tickerMap) return tickerMap;
  tickerMap = {};
  Object.values(tickerData).forEach(({ ticker, cik_str, title }) => {
    tickerMap[ticker.toUpperCase()] = {
      cik: String(cik_str).padStart(10, '0'),
      name: title,
    };
  });
  return tickerMap;
}

export async function searchCompanies(query, limit = 10) {
  const map = await loadTickerMap();
  const q = query.toUpperCase().trim();
  const results = [];
  if (map[q]) results.push({ symbol: q, name: map[q].name, cik: map[q].cik });
  for (const [ticker, info] of Object.entries(map)) {
    if (results.length >= limit) break;
    if (ticker !== q && ticker.startsWith(q))
      results.push({ symbol: ticker, name: info.name, cik: info.cik });
  }
  if (results.length < limit) {
    const ql = query.toLowerCase();
    for (const [ticker, info] of Object.entries(map)) {
      if (results.length >= limit) break;
      if (!ticker.startsWith(q) && info.name.toLowerCase().includes(ql))
        results.push({ symbol: ticker, name: info.name, cik: info.cik });
    }
  }
  return results.slice(0, limit);
}

export async function getCIK(ticker) {
  const map = await loadTickerMap();
  const entry = map[ticker.toUpperCase()];
  if (!entry) throw new Error(`Ticker ${ticker} not found in SEC database`);
  return entry.cik;
}

function latestAnnual(facts, concept) {
  const ns = facts?.['us-gaap']?.[concept];
  if (!ns) return null;
  const units = ns.units?.USD || ns.units?.shares || ns.units?.['USD/shares'];
  if (!units) return null;
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

// Returns last N years of annual data for a concept
function annualHistory(facts, concept, n = 5) {
  const ns = facts?.['us-gaap']?.[concept];
  if (!ns) return null;
  const units = ns.units?.USD || ns.units?.shares || ns.units?.['USD/shares'];
  if (!units) return null;
  const annual = units
    .filter(u => u.form === '10-K' && u.val != null)
    .sort((a, b) => new Date(b.end) - new Date(a.end))
    .slice(0, n)
    .reverse();
  return {
    labels: annual.map(u => u.end.slice(0, 4)),
    values: annual.map(u => u.val),
  };
}

export async function getSecFundamentals(ticker) {
  const cik = await getCIK(ticker);
  const url = `${SEC_FACTS}/CIK${cik}.json`;
  const res = await fetch(url);
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

  // historical series
  const revenueHistory = annualHistory(f, 'Revenues')
    || annualHistory(f, 'RevenueFromContractWithCustomerExcludingAssessedTax')
    || annualHistory(f, 'SalesRevenueNet');
  const netIncomeHistory = annualHistory(f, 'NetIncomeLoss');
  const epsHistory = annualHistory(f, 'EarningsPerShareBasic')
    || annualHistory(f, 'EarningsPerShareDiluted');

  return {
    ticker: ticker.toUpperCase(),
    name: json.entityName,
    cik,
    revenue, netIncome, grossProfit, eps,
    totalDebt, totalEquity, totalAssets, shares, dividends,
    grossMargin: (revenue && grossProfit) ? grossProfit / revenue : null,
    netMargin: (revenue && netIncome) ? netIncome / revenue : null,
    debtToEquity: (totalDebt && totalEquity) ? totalDebt / totalEquity : null,
    roe: (netIncome && totalEquity) ? netIncome / totalEquity : null,
    revenueHistory,
    netIncomeHistory,
    epsHistory,
  };
}
