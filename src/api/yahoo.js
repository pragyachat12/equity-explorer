export async function fetchPrice(ticker) {
  const res = await fetch(`/api/yahoo-price?ticker=${ticker}`);
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No price data for ${ticker}`);
  const closes = result.indicators.quote[0].close.filter(Boolean);
  const last = closes.at(-1);
  const prev = closes.at(-2);
  const delta = prev ? ((last - prev) / prev * 100).toFixed(2) : null;
  return { price: last.toFixed(2), delta };
}