# Life Science Investor

A daily-updated tracker for clinical-stage biotech stocks: prices and returns, cash runway, insider trades, catalysts, earnings dates and news, organized by therapeutic theme.

**Live site:** https://kiruijk.github.io/biotech-stock-digest/

## What's on the site

- **Dashboard.** Stocks ranked by return over any period from 1D to 10Y, with a card view (sparklines) and a sortable screener view (market cap, cash runway), search, and theme filters. Also a combined news feed and upcoming earnings.
- **Stock profiles** (`stocks/<ticker>.html`). An interactive price chart, returns, cash and monthly burn, runway, insider trades from SEC Form 4 filings, leadership and news. Covered stocks also get written analysis: overview, catalysts, risks, competitors and partnerships, each with a "last reviewed" date.
- **Theme pages** (`themes/<theme>.html`). Science background for each theme (obesity & metabolic, gene editing, cell therapy, melanoma and more), plus a company comparison, upcoming catalysts and earnings, and news.
- **Catalyst & earnings calendar** (`calendar.html`). Every upcoming event across all tracked stocks, grouped by date.

## How it works

It's a static site with no backend or build step, hosted on GitHub Pages.

A scheduled GitHub Action (`.github/workflows/update-stocks.yml`) runs `update-stocks.js` after the US market close each weekday. The script:

1. Reads the stock list from `data/universe.json`.
2. Fetches prices, price history, quarterly financials, company info, insider transactions and earnings dates from Yahoo Finance (via [`yahoo-finance2`](https://github.com/gadicc/node-yahoo-finance2)), and news from Yahoo and Google News.
3. Writes the fetched data to `data/market.json` and `data/history/`.
4. Regenerates every page from the templates in `templates/`, combining the fetched data with written content from `data/profiles/` and `data/themes/`.
5. Commits the results. A freshness check then fails the run if data is missing or stale, and an editorial review queue is posted to the run summary.

## Project layout

```
index.html              Dashboard (script-rendered; data and some sections injected by update-stocks.js)
stocks/, themes/,
calendar.html           Generated pages — don't edit by hand
update-stocks.js        Fetches data and renders everything
templates/              Page templates (profile, theme, calendar, shared nav/footer)
lib/                    Shared helpers (catalyst date parsing, theme slugs)
data/universe.json      Tracked stocks, names and themes
data/profiles/          Written analysis per covered stock
data/themes/            Science background per theme
data/market.json        Latest fetched data (written by the update)
data/history/           Daily price history per stock (written by the update)
data/site.json          Public URL, name and description
check-freshness.js      Fails the workflow if data is missing or stale
review-queue.js         Lists content that needs a human review
```

## Running locally

Requires Node.js 20+.

```bash
npm install
npm run update    # fetch fresh data and regenerate all pages
npm run render    # regenerate pages from saved data, no fetching (for template changes)
npm run review    # list editorial content that needs review
open index.html
```

## Adding a stock

Add `{ "symbol", "name", "themes" }` to `data/universe.json` and run `npm run update`. The stock gets a data-only page. To add written analysis, create `data/profiles/<ticker>.json` (copy an existing one as a starting point).

## Disclaimer

For informational purposes only — not investment advice. Data comes from Yahoo Finance and company filings and may be delayed, incomplete or inaccurate. Company profiles are editorial summaries and may not reflect the latest developments.
