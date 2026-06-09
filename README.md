# Stock Fundamentals Explorer

Full fundamentals for any company listed on NYSE, NASDAQ, or AMEX. Search by ticker or name, browse by sector, or screen by P/E range.

**Data via:**
- [Financial Modeling Prep](https://financialmodelingprep.com) (free tier — 250 req/day) — fundamentals
- Yahoo Finance (via CORS proxy) — live price + delta

---

## Metrics per company

P/E · P/B · EPS (TTM) · Revenue · Gross Margin · Net Margin · Debt/Equity · ROE · Dividend Yield · Beta · 52W High · Market Cap

---

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/stock-fundamentals.git
cd stock-fundamentals
npm install
cp .env.example .env
# paste your FMP key into .env
npm run dev
```

Get a free FMP key at [financialmodelingprep.com](https://financialmodelingprep.com/developer/docs/).

---

## Project structure

```
stock-fundamentals/
├── index.html
├── vite.config.js
├── .env.example
├── src/
│   ├── main.js               ← entry, tabs, search, screener orchestration
│   ├── api/
│   │   ├── fmp.js            ← FMP fundamentals API
│   │   └── yahoo.js          ← Yahoo Finance price proxy
│   └── components/
│       ├── cards.js          ← company card + screener row renderers
│       └── formatters.js     ← number formatting, sector list
└── styles/
    └── main.css
```

---

## Roadmap (v2)

- [ ] Revenue + EPS historical charts per company
- [ ] Watchlist (localStorage)
- [ ] Export screener results to CSV
- [ ] Sector comparison view

---

## License

MIT
