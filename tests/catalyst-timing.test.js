const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTimingEnd, isPast } = require('../lib/catalyst-timing');
const { themeSlug } = require('../lib/themes');

const end = (timing) => parseTimingEnd(timing)?.toISOString().slice(0, 10) ?? null;

test('quarters, halves and years resolve to their last day', () => {
  assert.equal(end('Q3 2026'), '2026-09-30');
  assert.equal(end('Q4 2026'), '2026-12-31');
  assert.equal(end('1H 2027'), '2027-06-30');
  assert.equal(end('2H 2026'), '2026-12-31');
  assert.equal(end('2028'), '2028-12-31');
});

test('months and exact days', () => {
  assert.equal(end('September 2026'), '2026-09-30');
  assert.equal(end('October 15, 2026'), '2026-10-15');
});

test('qualified years', () => {
  assert.equal(end('Early 2027'), '2027-03-31');
  assert.equal(end('Mid-2027'), '2027-06-30');
  assert.equal(end('Late 2026'), '2026-12-31');
  assert.equal(end('End of 2026'), '2026-12-31');
  assert.equal(end('By end of 2026'), '2026-12-31');
  assert.equal(end('As early as YE2026'), '2026-12-31');
});

test('ranges take the latest date', () => {
  assert.equal(end('2026–2027'), '2027-12-31');
  assert.equal(end('2H 2026 – 2027'), '2027-12-31');
  assert.equal(end('1H 2027 / 2027'), '2027-12-31');
  assert.equal(end('Near-term (2H 2026)'), '2026-12-31');
});

test('undated timings return null and are never past', () => {
  for (const t of ['Ongoing', 'Each quarter', 'After 78-week dosing', 'Near-term']) {
    assert.equal(parseTimingEnd(t), null, t);
    assert.equal(isPast(t), false, t);
  }
});

test('isPast compares against the given date', () => {
  const oct5 = new Date('2026-10-05T12:00:00Z');
  assert.equal(isPast('Q3 2026', oct5), true);
  assert.equal(isPast('September 2026', oct5), true);
  assert.equal(isPast('Q4 2026', oct5), false);
  assert.equal(isPast('October 15, 2026', oct5), false);
  // The last day of the window is not yet past
  assert.equal(isPast('Q3 2026', new Date('2026-09-30T20:00:00Z')), false);
});

test('theme slugs', () => {
  assert.equal(themeSlug('Obesity & Metabolic'), 'obesity-and-metabolic');
  assert.equal(themeSlug('Bladder & Prostate Cancer'), 'bladder-and-prostate-cancer');
  assert.equal(themeSlug('Gene Editing & RNA'), 'gene-editing-and-rna');
});
