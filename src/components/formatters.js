export function fmt(val, decimals = 2, suffix = '') {
  if (val == null || isNaN(val)) return '—';
  return Number(val).toFixed(decimals) + suffix;
}

export function fmtLarge(val) {
  if (val == null || isNaN(val)) return '—';
  const n = Number(val);
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
  return '$' + n.toLocaleString();
}

export function fmtPct(val) {
  if (val == null || isNaN(val)) return '—';
  return (Number(val) * 100).toFixed(1) + '%';
}

export function deltaClass(delta) {
  if (delta == null) return 'flat';
  return Number(delta) >= 0 ? 'up' : 'down';
}

export const SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Cyclical',
  'Industrials', 'Communication Services', 'Consumer Defensive',
  'Energy', 'Real Estate', 'Basic Materials', 'Utilities'
];
