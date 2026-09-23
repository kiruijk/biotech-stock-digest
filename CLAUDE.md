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
- `index.html` — dashboard: theme filter, stocks ranked by a selectable return period, and a combined news feed
- `stocks/<ticker>.html` — **generated** profile pages (one per stock in `data/universe.json`), fully rewritten on every run from `templates/profile.js` + `templates/profile.css`. Never edit these by hand; edit the data files or template instead.

**Data files:**
- `data/universe.json` — the stock list: symbol, company name, themes, plus the list of themes shown as homepage filters.
- `data/profiles/<ticker>.json` — hand-written editorial content (overview, competitors, catalysts, risks, partners, interpretation) with a `reviewed` date. A stock **with** a profile file is "covered" and its page includes these sections; a stock **without** one is "tracked" and gets a data-only page (Yahoo business description, stats, insiders, leadership, news). Profile fields are trusted HTML.
- `data/market.json` — everything fetched on the last run (prices, returns, cash/burn, company info, insider trades, news). Written by the bot; also the fallback when a ticker's fetch fails.

**Data flow, driven entirely by `update-stocks.js`:**
1. Reads `STOCKS` (currently `['VKTX', 'IOVA', 'REPL']`) and fetches quotes/history via `yahoo-finance2`.
2. Fetches news from two sources and merges/dedupes them: `getYahooNews()` (from the quote's `news` field) and `getGoogleNews()` (scrapes Google News RSS via manual regex parsing, no XML library). Headlines matching `LOW_VALUE_NEWS` (law-firm lawsuit ads, quote pages, "should you buy?" filler) are dropped. Falls back to hardcoded `demoNews` if nothing is found. The script is designed to never hard-fail on a bad API call: a ticker whose quote fails keeps its previous data, flagged `stale`.
3. Computes returns for every period in `RETURN_PERIODS` (5D through 10Y) from ~10 years of daily closes (`getReturns`); a period the stock's history doesn't reach is `null` (shown as —). Cash and burn come from Yahoo's quarterly statements via `fundamentalsTimeSeries` (`getFinancials`): cash = cash + short-term investments + long-term marketable securities (converted to USD for non-USD filers), burn = latest quarter's operating cash outflow ÷ 3. `cashOverrides` holds hand-entered figures for companies where Yahoo's balance sheet is incomplete (currently PRME); an override is used only while its `asOf` date is at least as recent as Yahoo's latest quarter, so update it after each 10-Q.
4. Fetches company description, leadership and Form 4 insider trades (`getCompanyInfo`, via `quoteSummary`). All Yahoo calls go through `withRetry()`.
5. Writes outputs (`updateAll()`):
   - `data/market.json` — full data.
   - `index.html` — the `const demoData = {...}` literal and `const THEMES = [...]` are regex-replaced with a lighter copy of the data (no company/insider details, 3 news items per stock, plus a `covered` flag).
   - `stocks/<ticker>.html` — every page re-rendered via `renderProfile(stock, profile)`. Generated pages for tickers removed from the universe are deleted.

**When changing profile page layout**, edit `templates/profile.js` / `templates/profile.css` and run `npm run update`; all pages regenerate.

**When adding a new stock**, add an entry (symbol, name, themes) to `data/universe.json` and run `npm run update` — that's enough for a data-only page. To make it "covered", add `data/profiles/<ticker>.json` (copy an existing one). Add a `cashOverrides` entry in `update-stocks.js` only if Yahoo's cash figure doesn't match the 10-Q.

## Automation

`.github/workflows/update-stocks.yml` runs `update-stocks.js` on push to `main` and on a weekday cron (4:15 PM ET / 20:15 UTC), then commits and pushes `index.html`, `stocks/` and `data/market.json` directly (`git commit` + `git push` inside the Action, author "Stock Bot"). A final step runs `check-freshness.js`, which fails the run (triggering GitHub's failure email) if any ticker is missing or more than 3 are stale; it runs after the commit so good data is still saved. No API keys/secrets are currently required — `yahoo-finance2` and Google News RSS need no auth. See `AUTOMATION_SETUP.md` for the original (now partially outdated) Finnhub/NewsAPI setup notes — the script has since moved to Yahoo Finance + Google News RSS instead.

Because the workflow commits back to `main` automatically, expect frequent bot commits (`🤖 Update stock prices and news - ...`) in git history unrelated to manual changes.
