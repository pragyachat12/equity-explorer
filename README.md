# Stock Fundamentals Explorer

An interactive dashboard for exploring full fundamentals for any company listed on NYSE, NASDAQ, or AMEX.
You can search by ticker or name, browse by sector, or screen by P/E range!

Data sourced from:
- [Financial Modeling Prep API](https://financialmodelingprep.com) — fundamentals
- Yahoo Finance (via CORS proxy) — live price + delta


## Data Source
- [SEC EDGAR](https://www.sec.gov/edgar) — revenue, net income, EPS, margins, debt/equity, ROE (from 10-K/10-Q filings)
- Yahoo Finance (via proxy) — live price + day delta

## Metrics per company

Market Cap · P/E · P/B · EPS · Revenue · Net Income · Gross Margin · Net Margin · Debt/Equity · ROE · Total Assets · Dividend Yield

Plus 5-year historical charts for Revenue, Net Income, and EPS.

## How to Setup!

**1. Clone the repo**
```bash
git clone https://github.com/pragyachat12/stock-fundamentals.git
cd stock-fundamentals
```

**2. Install dependencies**
```bash
npm install
```

**3. Run the dev server**
```bash
npm run dev
```

Then open `http://localhost:5173/stock-fundamentals/` in your browser.

## Project structure

```
stock-fundamentals/
├── index.html
├── vite.config.js
├── src/
│   ├── main.js               ← entry, search, company load
│   ├── api/
│   │   ├── sec.js            ← SEC EDGAR ticker search + fundamentals
│   │   └── yahoo.js          ← Yahoo Finance live price
│   └── components/
│       ├── cards.js          ← company card + chart rendering
│       └── formatters.js     ← number formatting, sector list
└── styles/
    └── main.css
```

