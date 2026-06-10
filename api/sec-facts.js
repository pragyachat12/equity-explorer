export default async function handler(req, res) {
  const { cik } = req.query;
  if (!cik) return res.status(400).json({ error: 'CIK required' });

  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'pragyachat12 pragyachat12@gmail.com' }
  });

  if (!response.ok) return res.status(response.status).json({ error: 'SEC fetch failed' });

  const data = await response.json();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(data);
}