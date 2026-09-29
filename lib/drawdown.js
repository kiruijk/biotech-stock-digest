// Drawdown figures for the "Beaten Down, Not Out" list, shared by update-stocks.js (page
// metrics) and review-queue.js (flags for when the list needs a human look).

// How far a stock sits below its highest close in the stored history (~10 years), how far
// it has bounced off its 52-week low, and (given the date it was added to the list) its
// return since then. Percentages are rounded to whole numbers; null when unknown.
function drawdownStats(history, price, added = null, now = new Date()) {
  if (!history.length || price == null) return null;
  let peak = history[0];
  for (const r of history) if (r[1] > peak[1]) peak = r;
  const yearAgo = new Date(now);
  yearAgo.setMonth(yearAgo.getMonth() - 12);
  const lastYear = history.filter(r => r[0] >= yearAgo.toISOString().slice(0, 10));
  const low = lastYear.length ? Math.min(...lastYear.map(r => r[1]), price) : null;
  const pct = (from) => (from ? Math.round((price / from - 1) * 100) : null);
  // Close on the added date, or the last trading day before it
  const base = added ? history.filter(r => r[0] <= added).pop() : null;
  return {
    peak: Math.max(peak[1], price),
    peakDate: peak[1] >= price ? peak[0] : null,
    fromPeak: peak[1] >= price ? pct(peak[1]) : 0,
    fromLow: pct(low),
    sinceAdded: base ? pct(base[1]) : null
  };
}

// Thresholds for review-queue flags
const REBOUND_SINCE_ADDED = 50;   // up this much since added: is it still beaten down?
const SHALLOW_DRAWDOWN = -50;     // no longer at least this far below its high
const SLUMP_SINCE_ADDED = -30;    // down this much since added: is the thesis broken?
const CANDIDATE_DRAWDOWN = -80;   // unlisted stock at least this far below its high...
const CANDIDATE_CASH_TO_CAP = 0.5; // ...with cash at least this share of its market cap

// Review flags for listed stocks. `stats` from drawdownStats; returns a reason or null.
function listedFlag(stats) {
  if (!stats) return null;
  if (stats.sinceAdded != null && stats.sinceAdded >= REBOUND_SINCE_ADDED) return `up ${stats.sinceAdded}% since added — still beaten down, or has the thesis played out?`;
  if (stats.fromPeak > SHALLOW_DRAWDOWN) return `now only ${Math.abs(stats.fromPeak)}% below its high — still beaten down?`;
  if (stats.sinceAdded != null && stats.sinceAdded <= SLUMP_SINCE_ADDED) return `down ${Math.abs(stats.sinceAdded)}% since added — is the thesis broken?`;
  return null;
}

// Whether an unlisted stock looks like a candidate: deep drawdown and trading near cash
function isCandidate(stock, stats) {
  return Boolean(stats && stats.fromPeak <= CANDIDATE_DRAWDOWN &&
    stock.cashPosition && stock.marketCap && stock.cashPosition / stock.marketCap >= CANDIDATE_CASH_TO_CAP);
}

module.exports = { drawdownStats, listedFlag, isCandidate };
