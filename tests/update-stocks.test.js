const test = require('node:test');
const assert = require('node:assert/strict');
const u = require('../update-stocks.js');

// ---- Cash & burn ----

test('cash = short-term + long-term marketable securities, converted to USD', () => {
  const rows = [
    { date: new Date('2026-03-31'), cashCashEquivalentsAndShortTermInvestments: 500e6, operatingCashFlow: -60e6 },
    { date: new Date('2026-06-30'), cashCashEquivalentsAndShortTermInvestments: 437.8e6, investmentinFinancialAssets: 190.6e6, operatingCashFlow: -83e6 }
  ];
  const r = u.financialsFromRows(rows, 1);
  assert.equal(Math.round(r.cashPosition / 1e5) / 10, 628.4);  // NTLA-style: 437.8 + 190.6
  assert.equal(r.cashAsOf, '2026-06-30');
  assert.equal(Math.round(r.monthlyBurn / 1e5) / 10, 27.7);    // 83 / 3
  assert.equal(r.cashFlowPositive, undefined);

  const eur = u.financialsFromRows([{ date: new Date('2026-06-30'), cashCashEquivalentsAndShortTermInvestments: 100e6, operatingCashFlow: -30e6 }], 1.14);
  assert.equal(Math.round(eur.cashPosition), 114e6);
});

test('falls back to investmentsAndAdvances; positive cash flow means no burn', () => {
  const r = u.financialsFromRows([
    { date: new Date('2026-06-30'), cashCashEquivalentsAndShortTermInvestments: 326.3e6, investmentsAndAdvances: 192.2e6, operatingCashFlow: 16e6 }
  ], 1);
  assert.equal(Math.round(r.cashPosition / 1e5) / 10, 518.5);
  assert.equal(r.monthlyBurn, undefined);
  assert.equal(r.cashFlowPositive, true);
});

test('no FX rate means no figures (never show foreign currency as USD)', () => {
  const r = u.financialsFromRows([{ date: new Date('2026-06-30'), cashCashEquivalentsAndShortTermInvestments: 100e6, operatingCashFlow: -1e6 }], null);
  assert.deepEqual(r, {});
});

test('cash override applies while at least as recent as Yahoo, then is flagged', () => {
  const override = { amount: 304e6, asOf: '2026-06-30' };
  assert.deepEqual(u.applyCashOverride({ cashPosition: 110.8e6, cashAsOf: '2026-06-30' }, override),
    { cashPosition: 304e6, cashAsOf: '2026-06-30' });
  assert.deepEqual(u.applyCashOverride({}, override), { cashPosition: 304e6, cashAsOf: '2026-06-30' });
  assert.deepEqual(u.applyCashOverride({ cashPosition: 120e6, cashAsOf: '2026-09-30' }, override),
    { cashOverrideSuperseded: { overrideAsOf: '2026-06-30', yahooAsOf: '2026-09-30' } });
  assert.deepEqual(u.applyCashOverride({ cashAsOf: '2026-06-30' }, undefined), {});
});

// ---- Returns ----

test('returns measure from the last close on or before the target date', () => {
  const sorted = [
    { date: new Date('2026-08-20'), close: 30 },
    { date: new Date('2026-08-21'), close: 32 },  // Friday
    { date: new Date('2026-08-24'), close: 35 }   // Monday
  ];
  // Target falls on Sunday Aug 23 → use Friday's close, not Monday's
  const r = u.returnsFromHistory(sorted, 40, { oneMonth: new Date('2026-08-23T12:00:00Z') });
  assert.equal(r.oneMonth, 25);  // 40 / 32 - 1
});

test('targets before the first close are null (recent IPOs)', () => {
  const sorted = [{ date: new Date('2026-04-17'), close: 26 }];
  const r = u.returnsFromHistory(sorted, 13, { ytd: new Date('2025-12-31'), oneMonth: new Date('2026-08-23') });
  assert.equal(r.ytd, null);
  assert.equal(r.oneMonth, -50);
});

// ---- Insiders ----

test('insider names: LAST FIRST → First Last, suffixes kept, entities left in order', () => {
  assert.equal(u.formatInsiderName('LIAN BRIAN'), 'Brian Lian');
  assert.equal(u.formatInsiderName('DULAC EDWARD J III'), 'Edward J Dulac III');
  assert.equal(u.formatInsiderName('RENAUD RONALD C JR'), 'Ronald C Renaud Jr.');
  assert.equal(u.formatInsiderName('KELLY-GEMMELL DOROTHY ELIZABETH'), 'Dorothy Elizabeth Kelly-Gemmell');
  assert.equal(u.formatInsiderName('RA CAPITAL MANAGEMENT, L.P.'), 'RA Capital Management, L.P.');
  assert.equal(u.formatInsiderName('BAIN CAPITAL LIFE SCIENCES INVESTORS, LLC'), 'Bain Capital Life Sciences Investors, LLC');
  assert.equal(u.formatInsiderName('FMR, L.L.C.'), 'FMR, L.L.C.');
});

test('insider relationships and transaction types', () => {
  assert.equal(u.formatRelation('Beneficial Owner of more than 10% of a Class of Security'), '10% Owner');
  assert.equal(u.formatRelation('Director and Beneficial Owner of more than 10% of a Class of Security'), 'Director, 10% Owner');
  assert.equal(u.classifyTransaction('Purchase at price 8.69 per share.'), 'BUY');
  assert.equal(u.classifyTransaction('Sale at price 33.32 per share.'), 'SELL');
  assert.equal(u.classifyTransaction('Stock Award(Grant) at price 0.00 per share.'), 'AWARD');
  assert.equal(u.classifyTransaction('Conversion of Exercise of derivative security at price 0.34 per share.'), 'EXERCISE');
  assert.equal(u.classifyTransaction('Stock Gift at price 0.00 per share.'), 'GIFT');
});

test('parseInsiders skips holdings rows, sorts newest first', () => {
  const rows = u.parseInsiders([
    { filerName: 'LIAN BRIAN', filerRelation: 'Chief Executive Officer', startDate: new Date('2026-07-28'), transactionText: 'Stock Award(Grant) at price 0.00 per share.', shares: 221667, value: 0 },
    { filerName: 'LIAN BRIAN', filerRelation: 'Chief Executive Officer', startDate: new Date('2026-07-29'), transactionText: 'Sale at price 33.32 per share.', shares: 148517, value: 4947888 },
    { filerName: 'KOPPEL ADAM M', filerRelation: 'Director', startDate: new Date('2026-04-20'), transactionText: '', shares: 21020768 }
  ]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(r => r.type), ['SELL', 'AWARD']);
  assert.equal(rows[1].value, null);  // $0 awards show no amount
});

// ---- Earnings ----

test('next earnings ignores dates already passed', () => {
  const future = new Date(Date.now() + 30 * 864e5);
  assert.equal(u.parseNextEarnings({ earningsDate: [new Date('2020-01-01')] }), null);
  assert.deepEqual(u.parseNextEarnings({ earningsDate: [future], isEarningsDateEstimate: true }),
    { date: future.toISOString().slice(0, 10), estimated: true });
  assert.equal(u.parseNextEarnings(undefined), null);
});

// ---- News ----

test('material news: real events flagged', () => {
  for (const t of [
    'Viking Therapeutics Announces Proposed Offerings of Common Stock and Convertible Senior Notes',
    'Viking shares surge over 27% on weight loss drug maintenance data',
    'FDA grants accelerated approval to vusolimogene oderparepvec',
    'Compass Therapeutics Provides Regulatory Update Following FDA Feedback',
    'Intellia Phase 3 HAELO trial met primary endpoint',
    'Structure reports topline ACCESS II data',
    'Iovance appoints new Chief Executive Officer',
    'Prime Medicine announces restructuring and workforce reduction'
  ]) assert.equal(u.isMaterialNews(t), true, t);
});

test('material news: non-events not flagged', () => {
  for (const t of [
    'Caribou CEO set for fireside chat at cell therapy conference June 30',
    'Kailera Therapeutics: An Outside Biotech Bet For The Next GLP-1 Obesity Drug Approval',
    'CRISPR Therapeutics stock trades below targets despite approved gene therapy',
    "Viking's Obesity Edge May Be Staying Power, Not Weight Loss",
    'Wave Life Sciences Appoints Monika Vnuk as Chief Business Officer'
  ]) assert.equal(u.isMaterialNews(t), false, t);
});

test('low-value headlines filtered', () => {
  for (const title of [
    'REPL UPCOMING DEADLINE: Levi &amp; Korsinsky Alerts Replimune Group, Inc. Stockholders',
    'Altimmune, Inc. (ALT) Stock Price, News, Quote &amp; History - Yahoo! Finance Canada',
    'Prime Medicine (NASDAQ:PRME) Stock Price Down 7.5% - Should You Sell? - MarketBeat',
    'Immatics (IMTX) Stock Forecast and Price Target 2026 - MarketBeat'
  ]) assert.equal(u.isLowValueNews({ title }), true, title);
  assert.equal(u.isLowValueNews({ title: 'Intellia Presents Phase 3 HAELO Data' }), false);
});

test('news titles lose a trailing " - Source"', () => {
  assert.equal(u.cleanNewsTitle({ title: 'Compass stock downgraded at Wedbush - Seeking Alpha', source: 'Seeking Alpha' }), 'Compass stock downgraded at Wedbush');
  assert.equal(u.cleanNewsTitle({ title: 'What Janux Means - simplywall.st', source: 'simplywall.st' }), 'What Janux Means');
  assert.equal(u.cleanNewsTitle({ title: 'Janux - a deep dive', source: 'Reuters' }), 'Janux - a deep dive');
});

test('material news carries forward until the review date passes it', () => {
  const offering = { title: 'Immatics Announces $150 Million Underwritten Offering', source: 'X', date: '2026-10-02T12:00:00Z', url: 'a' };
  const older = { title: 'Immatics files FDA offering documents', source: 'X', date: '2026-09-01T12:00:00Z', url: 'b' };
  // Picked up from today's news
  let flagged = u.updateMaterialNews({ news: [offering] }, null, '2026-09-23');
  assert.deepEqual(flagged.map(n => n.url), ['a']);
  // Still there after it drops out of the news list
  flagged = u.updateMaterialNews({ news: [] }, { materialNews: flagged }, '2026-09-23');
  assert.deepEqual(flagged.map(n => n.url), ['a']);
  // Cleared once the profile is re-reviewed after it
  assert.deepEqual(u.updateMaterialNews({ news: [] }, { materialNews: flagged }, '2026-10-03'), []);
  // Items dated on/before the review date are ignored; no review date → nothing tracked
  assert.deepEqual(u.updateMaterialNews({ news: [older] }, null, '2026-09-23'), []);
  assert.deepEqual(u.updateMaterialNews({ news: [offering] }, null, undefined), []);
});

// ---- Charts & output ----

test('downsample keeps first and last, respects max', () => {
  const rows = Array.from({ length: 100 }, (_, i) => i);
  const d = u.downsample(rows, 10);
  assert.equal(d.length, 10);
  assert.equal(d[0], 0);
  assert.equal(d[9], 99);
  assert.deepEqual(u.downsample([1, 2, 3], 10), [1, 2, 3]);
});

test('sparklines skip periods the history does not reach and end at the current price', () => {
  const today = new Date();
  const history = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today.getTime() - (60 - i) * 864e5);
    return [d.toISOString().slice(0, 10), 10 + i];
  });
  const s = u.sparklines(history, 99);
  assert.ok(s.fiveDay && s.oneMonth, 'short periods present');
  assert.equal(s.oneYear, undefined, '1Y absent with 60 days of history');
  assert.equal(s.oneMonth[s.oneMonth.length - 1], 99);
  assert.ok(s.oneMonth.length <= 41);
  assert.equal(u.sparklines([], 10), null);
});

test('compactNumberArrays only collapses plain number arrays', () => {
  const json = JSON.stringify({ spark: [1.5, 2, -3], names: ['a', 'b'], n: 4 }, null, 2);
  const out = u.compactNumberArrays(json);
  assert.match(out, /"spark": \[1\.5,2,-3\]/);
  assert.match(out, /"names": \[\n\s+"a",\n\s+"b"\n\s+\]/);
  assert.deepEqual(JSON.parse(out), JSON.parse(json));
});

test('data time label uses the latest non-stale refresh, in Eastern time', () => {
  const label = u.dataTimeLabel({
    A: { updatedAt: '2026-09-23T21:23:13Z' },
    B: { updatedAt: '2026-09-23T20:00:00Z' },
    C: { updatedAt: '2026-09-24T21:00:00Z', stale: true }
  });
  assert.equal(label, 'Sep 23, 2026, 5:23 PM ET');
  assert.equal(u.dataTimeLabel({}), '—');
});
