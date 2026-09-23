#!/usr/bin/env node

// Lists editorial content that probably needs a human look:
//   - catalysts whose timing has passed
//   - profiles or theme explainers not reviewed in REVIEW_AFTER_DAYS
//   - stocks that moved more than BIG_MOVE_PCT since their profile was reviewed
//   - cash overrides that Yahoo has since superseded
// Run with `npm run review`. In GitHub Actions the report is also written to the run's
// summary page. Always exits 0 — this is a to-do list, not a failure.

const fs = require('fs');
const { isPast } = require('./lib/catalyst-timing');
const { themeSlug } = require('./lib/themes');

const REVIEW_AFTER_DAYS = 90;
const BIG_MOVE_PCT = 30;

const universe = JSON.parse(fs.readFileSync('data/universe.json', 'utf8'));
const market = fs.existsSync('data/market.json') ? JSON.parse(fs.readFileSync('data/market.json', 'utf8')) : {};
const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null);
const daysSince = (date) => Math.floor((Date.now() - new Date(`${date}T00:00:00Z`)) / 864e5);

const items = { pastCatalysts: [], staleReviews: [], bigMoves: [], overrides: [] };

for (const { symbol } of universe.stocks) {
  const profile = readJson(`data/profiles/${symbol.toLowerCase()}.json`);
  const stock = market[symbol] || {};

  if (stock.cashOverrideSuperseded) {
    const o = stock.cashOverrideSuperseded;
    items.overrides.push(`${symbol}: cashOverrides entry is from ${o.overrideAsOf} but Yahoo has ${o.yahooAsOf} — check the new 10-Q and update or remove it in update-stocks.js`);
  }
  if (!profile) continue;

  for (const c of profile.catalysts) {
    if (isPast(c.timing)) items.pastCatalysts.push(`${symbol}: "${c.title}" (${c.timing})`);
  }
  const age = daysSince(profile.reviewed);
  if (age > REVIEW_AFTER_DAYS) items.staleReviews.push(`${symbol}: profile last reviewed ${profile.reviewed} (${age} days ago)`);
  if (stock.sinceReviewed != null && Math.abs(stock.sinceReviewed) >= BIG_MOVE_PCT) {
    items.bigMoves.push(`${symbol}: ${stock.sinceReviewed > 0 ? '+' : ''}${stock.sinceReviewed}% since review on ${profile.reviewed}`);
  }
}

for (const theme of universe.themes) {
  const content = readJson(`data/themes/${themeSlug(theme)}.json`);
  if (!content) items.staleReviews.push(`Theme "${theme}": no science background (data/themes/${themeSlug(theme)}.json)`);
  else if (daysSince(content.reviewed) > REVIEW_AFTER_DAYS) items.staleReviews.push(`Theme "${theme}": last reviewed ${content.reviewed}`);
}

const sections = [
  ['Cash overrides to update', items.overrides],
  ['Catalysts whose timing has passed', items.pastCatalysts],
  [`Stocks that moved ${BIG_MOVE_PCT}%+ since their profile review`, items.bigMoves],
  [`Not reviewed in ${REVIEW_AFTER_DAYS}+ days`, items.staleReviews]
];
const total = sections.reduce((n, [, list]) => n + list.length, 0);

const text = [`Editorial review queue: ${total} item${total === 1 ? '' : 's'}`]
  .concat(sections.filter(([, list]) => list.length).flatMap(([title, list]) => ['', `${title}:`, ...list.map(i => `  - ${i}`)]))
  .join('\n');
console.log(text);

if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [`## Editorial review queue (${total})`]
    .concat(sections.filter(([, list]) => list.length).flatMap(([title, list]) => ['', `**${title}**`, ...list.map(i => `- ${i}`)]))
    .concat(total ? [] : ['', 'Nothing to review.'])
    .join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
}
