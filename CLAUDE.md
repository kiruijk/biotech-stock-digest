# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A zero-backend biotech stock tracker: static HTML/CSS/JS pages hosted on GitHub Pages, kept fresh by a scheduled Node.js script run through GitHub Actions. There is no build step, no bundler, no framework — each page is a self-contained HTML file with inline `<style>` and `<script>`.

## Commands

```bash
npm run update        # node update-stocks.js — fetch live data and rewrite the HTML files locally
node update-stocks.js # same thing, direct
```

There is no lint, test, or build command in this repo (`package.json` only defines `update`). To preview a page, just open the HTML file directly in a browser (`open index.html`) — no dev server needed.

## Architecture

**Pages** (each is a standalone HTML file, not templated from a shared layout):
- `index.html` — dashboard listing all tracked stocks + combined news feed
- `vktx.html`, `iova.html`, `repl.html` — per-stock profile pages with financial detail cards

**Data flow, driven entirely by `update-stocks.js`:**
1. Reads `STOCKS` (currently `['VKTX', 'IOVA', 'REPL']`) and fetches quotes/history via `yahoo-finance2`.
2. Fetches news from two sources and merges/dedupes them: `getYahooNews()` (from the quote's `news` field) and `getGoogleNews()` (scrapes Google News RSS via manual regex parsing, no XML library). Falls back to hardcoded `demoNews`/`demoPrices` if a source errors or returns nothing — the script is designed to never hard-fail on a bad API call.
3. Computes 1D/5D/1M/6M/YTD returns from historical closes (`getReturns`), plus market cap, monthly burn (from quarterly `netIncome` via `quoteSummary`), and cash position. **Cash positions are hardcoded** in the `cashPositions` object (sourced manually from quarterly filings) since Yahoo's balance sheet data isn't reliable for these tickers — update this object by hand when a new 10-Q comes out.
4. Writes results back into the HTML files via two different mechanisms:
   - `index.html`: the entire `const demoData = {...}` JS object literal is regex-replaced wholesale with freshly serialized JSON (see `dataJSON` construction in `updateHTML()`).
   - Profile pages (`vktx.html`, etc.): individual DOM value spans are targeted and replaced in place using `data-field="..."` attribute regexes (`price`, `marketCap`, `ytd`, `monthlyBurn`, `cashPosition`, `burnRate`, `runway`). See `updateProfilePage()`.

**When adding a new field to a profile page**, add a `data-field="yourField"` span in the HTML and a matching regex replacement in `updateProfilePage()` — the two must stay in sync since there's no shared templating.

**When adding a new stock**, update in `update-stocks.js`: `STOCKS` array, `demoPrices`, `demoNews`, `cashPositions`, and the company-name ternary in `updateHTML()`; then create a new profile page (copy an existing one, e.g. `vktx.html`, and update the `data-field` values/company name) and add it to the `profilePages` map in `updateHTML()` and the `profileLinks` map in `index.html`'s `renderStocks()`.

## Automation

`.github/workflows/update-stocks.yml` runs `update-stocks.js` on push to `main` and on a weekday cron (4:15 PM ET / 20:15 UTC), then commits and pushes any changed HTML files directly (`git commit` + `git push` inside the Action, author "Stock Bot"). No API keys/secrets are currently required — `yahoo-finance2` and Google News RSS need no auth. See `AUTOMATION_SETUP.md` for the original (now partially outdated) Finnhub/NewsAPI setup notes — the script has since moved to Yahoo Finance + Google News RSS instead.

Because the workflow commits back to `main` automatically, expect frequent bot commits (`🤖 Update stock prices and news - ...`) in git history unrelated to manual changes.
