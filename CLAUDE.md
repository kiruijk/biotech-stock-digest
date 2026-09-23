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
- `stocks/<ticker>.html` (e.g. `stocks/vktx.html`) — one per-stock profile page per ticker in `STOCKS`, with financial detail cards. Each links back to `../index.html`.

**Data flow, driven entirely by `update-stocks.js`:**
1. Reads `STOCKS` (currently `['VKTX', 'IOVA', 'REPL']`) and fetches quotes/history via `yahoo-finance2`.
2. Fetches news from two sources and merges/dedupes them: `getYahooNews()` (from the quote's `news` field) and `getGoogleNews()` (scrapes Google News RSS via manual regex parsing, no XML library). Headlines matching `LOW_VALUE_NEWS` (law-firm lawsuit ads, quote pages, "should you buy?" filler) are dropped. Falls back to hardcoded `demoNews` if nothing is found. The script is designed to never hard-fail on a bad API call: a ticker whose quote fails keeps its previous data, flagged `stale`.
3. Computes returns for every period in `RETURN_PERIODS` (5D through 10Y) from ~10 years of daily closes (`getReturns`); a period the stock's history doesn't reach is `null` (shown as —). Cash and burn come from Yahoo's quarterly statements via `fundamentalsTimeSeries` (`getFinancials`): cash = cash + short-term investments + long-term marketable securities (converted to USD for non-USD filers), burn = latest quarter's operating cash outflow ÷ 3. `cashOverrides` holds hand-entered figures for companies where Yahoo's balance sheet is incomplete (currently PRME); an override is used only while its `asOf` date is at least as recent as Yahoo's latest quarter, so update it after each 10-Q.
4. Writes results back into the HTML files via two different mechanisms:
   - `index.html`: the entire `const demoData = {...}` JS object literal is regex-replaced wholesale with freshly serialized JSON (see `dataJSON` construction in `updateHTML()`).
   - Profile pages (`stocks/vktx.html`, etc.): individual DOM value spans are targeted and replaced in place using `data-field="..."` attribute regexes (`price`, `marketCap`, `ytd`, `monthlyBurn`, `cashPosition`, `cashAsOf`, `burnRate`, `runway`). See `updateProfilePage()`.

**When adding a new field to a profile page**, add a `data-field="yourField"` span in the HTML and a matching regex replacement in `updateProfilePage()` — the two must stay in sync since there's no shared templating.

**When adding a new stock**, update in `update-stocks.js`: the `STOCKS` array and `COMPANY_NAMES` (`demoNews` is optional; add a `cashOverrides` entry only if Yahoo's cash figure doesn't match the 10-Q); add the ticker to the `STOCKS` array in `index.html`; then create `stocks/<ticker>.html` (copy an existing one, e.g. `stocks/vktx.html`, and update the company content). Profile paths and dashboard links are derived from the lowercase ticker, so there are no link maps to update.

## Automation

`.github/workflows/update-stocks.yml` runs `update-stocks.js` on push to `main` and on a weekday cron (4:15 PM ET / 20:15 UTC), then commits and pushes `index.html` and `stocks/` directly (`git commit` + `git push` inside the Action, author "Stock Bot"). A final step runs `check-freshness.js`, which fails the run (triggering GitHub's failure email) if any ticker is missing or more than 3 are stale; it runs after the commit so good data is still saved. No API keys/secrets are currently required — `yahoo-finance2` and Google News RSS need no auth. See `AUTOMATION_SETUP.md` for the original (now partially outdated) Finnhub/NewsAPI setup notes — the script has since moved to Yahoo Finance + Google News RSS instead.

Because the workflow commits back to `main` automatically, expect frequent bot commits (`🤖 Update stock prices and news - ...`) in git history unrelated to manual changes.
