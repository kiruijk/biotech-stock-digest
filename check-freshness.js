#!/usr/bin/env node

// Fails (exit 1) when the latest update left too many tickers stale or missing, so the
// GitHub Actions run goes red and GitHub emails the repo owner. Run after update-stocks.js.

const fs = require('fs');

const MAX_STALE = 3;

const data = JSON.parse(fs.readFileSync('data/market.json', 'utf8'));
const stocks = JSON.parse(fs.readFileSync('data/universe.json', 'utf8')).stocks.map(s => s.symbol);

const missing = stocks.filter(symbol => !data[symbol]);
const stale = stocks.filter(symbol => data[symbol]?.stale);
// A hand-entered cash figure that Yahoo has overtaken: Yahoo's number is now shown, but it
// was incomplete for this company before, so the override needs refreshing from the 10-Q
const superseded = stocks.filter(symbol => data[symbol]?.cashOverrideSuperseded);

console.log(`Tickers: ${stocks.length} | missing: ${missing.length} | stale: ${stale.length}`);
if (missing.length) console.log(`  Missing: ${missing.join(', ')}`);
if (stale.length) console.log(`  Stale: ${stale.join(', ')}`);
if (superseded.length) console.log(`  Cash overrides superseded by newer Yahoo data: ${superseded.join(', ')} — update cashOverrides in update-stocks.js from the latest 10-Q`);

if (missing.length > 0 || stale.length > MAX_STALE || superseded.length > 0) {
  console.error(`❌ Data freshness check failed (allowed: 0 missing, ≤${MAX_STALE} stale, 0 superseded cash overrides)`);
  process.exit(1);
}
console.log('✅ Data freshness check passed');
