#!/usr/bin/env node

// Fails (exit 1) when the latest update left too many tickers stale or missing, so the
// GitHub Actions run goes red and GitHub emails the repo owner. Run after update-stocks.js.

const fs = require('fs');

const MAX_STALE = 3;

const html = fs.readFileSync('index.html', 'utf8');
const data = JSON.parse(html.match(/const demoData = (\{[\s\S]*?^\s*\});/m)[1]);
const src = fs.readFileSync('update-stocks.js', 'utf8');
const stocks = JSON.parse(src.match(/const STOCKS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));

const missing = stocks.filter(symbol => !data[symbol]);
const stale = stocks.filter(symbol => data[symbol]?.stale);

console.log(`Tickers: ${stocks.length} | missing: ${missing.length} | stale: ${stale.length}`);
if (missing.length) console.log(`  Missing: ${missing.join(', ')}`);
if (stale.length) console.log(`  Stale: ${stale.join(', ')}`);

if (missing.length > 0 || stale.length > MAX_STALE) {
  console.error(`❌ Data freshness check failed (allowed: 0 missing, ≤${MAX_STALE} stale)`);
  process.exit(1);
}
console.log('✅ Data freshness check passed');
