// Drawdown figures for the "Beaten Down, Not Out" list, shared by update-stocks.js (page
// metrics) and review-queue.js (flags for when the list needs a human look).

// "Beaten down" is measured against the highest close in this many months, so the list
// tracks recent collapses rather than stocks that peaked in an earlier bubble
const PEAK_WINDOW_MONTHS = 18;

const monthsBefore = (now, n) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

// How far a stock sits below its highest close in the last PEAK_WINDOW_MONTHS, how far it
// has bounced off its 52-week low, and (given the date it was added to the list) its return
// since then. Percentages are rounded to whole numbers; null when unknown.
function drawdownStats(history, price, added = null, now = new Date()) {
  if (!history.length || price == null) return null;
  const window = history.filter(r => r[0] >= monthsBefore(now, PEAK_WINDOW_MONTHS));
  if (!window.length) return null;
  let peak = window[0];
  for (const r of window) if (r[1] > peak[1]) peak = r;
  const lastYear = history.filter(r => r[0] >= monthsBefore(now, 12));
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
const SHALLOW_DRAWDOWN = -40;     // recovered to within this far of its 18-month high
const SLUMP_SINCE_ADDED = -30;    // down this much since added: is the thesis broken?
// Candidates must be at least this far below their 18-month high. Across tracked stocks since
// 2019, a 75%+ drawdown was where the odds of a 3x rebound turned favorable (a 50% one
// predicted little). The gap to SHALLOW_DRAWDOWN keeps stocks from flip-flopping.
const CANDIDATE_DRAWDOWN = -75;
// ...and then fit one of two setups:
const CANDIDATE_CASH_TO_CAP = 0.5;  // near cash: cash at least this share of market cap
const MIN_REVENUE_TTM = 20e6;       // commercial turnaround: an approved product selling at least this much a year...
const MAX_PRICE_TO_SALES = 5;       // ...still growing, and valued at most this multiple of sales
// Sector gauge: the biotech ETF this far below its 18-month high marks a sector-wide sell-off,
// when most of the biggest past rebounds started (Oct 2023, Apr 2025)
const SECTOR_SELLOFF = -30;

// Review flags for listed stocks. `stats` from drawdownStats; returns a reason or null.
function listedFlag(stats) {
  if (!stats) return null;
  if (stats.sinceAdded != null && stats.sinceAdded >= REBOUND_SINCE_ADDED) return `up ${stats.sinceAdded}% since added — still beaten down, or has the thesis played out?`;
  if (stats.fromPeak > SHALLOW_DRAWDOWN) return `now only ${Math.abs(stats.fromPeak)}% below its 18-month high — still beaten down?`;
  if (stats.sinceAdded != null && stats.sinceAdded <= SLUMP_SINCE_ADDED) return `down ${Math.abs(stats.sinceAdded)}% since added — is the thesis broken?`;
  return null;
}

// Which setup an unlisted stock fits, or null: 'near-cash' (priced close to its cash, like
// CTMX or OVID at their lows) or 'commercial' (a growing approved product crushed on a
// stumble, like IOVA after its 2025 guidance cut)
function candidateSetup(stock, stats) {
  if (!stats || stats.fromPeak > CANDIDATE_DRAWDOWN || !stock.marketCap) return null;
  if (stock.cashPosition && stock.cashPosition / stock.marketCap >= CANDIDATE_CASH_TO_CAP) return 'near-cash';
  if (stock.revenueTTM >= MIN_REVENUE_TTM && stock.revenueGrowth > 0 &&
    stock.marketCap / stock.revenueTTM <= MAX_PRICE_TO_SALES) return 'commercial';
  return null;
}

const isSectorSelloff = (stats) => Boolean(stats && stats.fromPeak <= SECTOR_SELLOFF);

module.exports = { drawdownStats, listedFlag, candidateSetup, isSectorSelloff, PEAK_WINDOW_MONTHS };
