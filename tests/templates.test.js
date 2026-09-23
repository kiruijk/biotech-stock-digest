const test = require('node:test');
const assert = require('node:assert/strict');
const { renderProfile, formatMoney, runwayText, insiderSummary } = require('../templates/profile');
const { renderTheme } = require('../templates/theme');
const { renderCalendar } = require('../templates/calendar');

const THEMES = ['Obesity & Metabolic', 'Melanoma'];

const stock = {
  symbol: 'TEST', name: 'Test Therapeutics', themes: ['Obesity & Metabolic'],
  price: 12.34, change: 0.5, changePercent: 4.2, marketCap: 1.5e9,
  cashPosition: 300e6, cashAsOf: '2026-06-30', monthlyBurn: 25e6,
  oneDay: 4.2, fiveDay: -1, oneMonth: 10, sixMonth: null, ytd: 20, oneYear: null, threeYear: null, fiveYear: null, tenYear: null,
  updatedAt: '2026-09-23T21:00:00Z',
  company: { summary: 'A <b>test</b> company.', city: 'Boston', state: 'MA', employees: 50, officers: [{ name: 'Jane Doe', title: 'CEO' }] },
  insiders: [], news: [{ title: 'Test news', source: 'Wire', date: '2026-09-23T12:00:00Z', url: 'https://example.com/a' }],
  nextEarnings: { date: '2099-11-05', estimated: true }
};

const profile = {
  symbol: 'TEST', reviewed: '2026-09-23',
  overview: ['<strong>Test</strong> overview.'],
  competitors: [{ name: 'Rival (RVL)', product: 'Drug', note: 'Leader' }],
  advantage: 'Faster.',
  catalysts: [{ title: 'Phase 3 data', timing: '2099', description: 'Readout.', impact: 'HIGH IMPACT', color: 'green' }],
  risks: [{ title: 'Clinical', description: 'Could fail.', level: 'HIGH' }],
  partners: [{ name: 'BigPharma', role: 'Partner', description: 'Deal.' }],
  interpretation: 'Enough cash.'
};

test('formatMoney', () => {
  assert.equal(formatMoney(null), 'N/A');
  assert.equal(formatMoney(1.24e9), '$1.2B');
  assert.equal(formatMoney(304e6), '$304M');
  assert.equal(formatMoney(7.5e6), '$7.5M');
  assert.equal(formatMoney(4.1e6), '$4.1M');
});

test('runwayText', () => {
  assert.equal(runwayText({ cashPosition: 300e6, monthlyBurn: 25e6 }), '12 months');
  assert.equal(runwayText({ cashPosition: 4.1e6, monthlyBurn: 4.4e6 }), '1 month');
  assert.equal(runwayText({ cashPosition: 1e6, monthlyBurn: 4e6 }), '<1 month');
  assert.equal(runwayText({ cashPosition: 880e6, monthlyBurn: 0.27e6 }), '10+ years');
  assert.equal(runwayText({ cashPosition: 1e9, cashFlowPositive: true }), 'No cash burn last qtr');
  assert.equal(runwayText({}), 'N/A');
});

test('insider summary wording', () => {
  const recent = new Date().toISOString().slice(0, 10);
  assert.match(insiderSummary([]), /No insider transactions reported/);
  assert.match(insiderSummary([{ type: 'BUY', value: 7.5e6, date: recent }]), /1 purchase \(\$7\.5M\) and no sales/);
  assert.match(insiderSummary([{ type: 'SELL', value: 1e6, date: recent }]), /no purchases and 1 sale/);
  assert.doesNotMatch(insiderSummary([{ type: 'BUY', value: 1e6, date: recent }]), /open-market/);
});

test('covered profile renders editorial sections, chart and SEO tags', () => {
  const html = renderProfile(stock, profile, THEMES, 'https://example.com/', { daily: [['2026-09-01', 10], ['2026-09-22', 12]], weekly: [] });
  for (const s of ['Direct Competitors', 'Upcoming Catalysts', 'Risk Factors', 'Analysis last reviewed Sep 23, 2026',
    'price-chart', '<link rel="canonical" href="https://example.com/stocks/test.html">',
    'href="../themes/obesity-and-metabolic.html"', 'not investment advice', 'class="site-nav"', 'Next earnings']) {
    assert.ok(html.includes(s), `missing: ${s}`);
  }
  assert.ok(!html.includes('notice-tracked">'), 'covered page should not show the data-only notice');
});

test('tracked profile shows data-only notice and escapes Yahoo text', () => {
  const html = renderProfile(stock, null, THEMES);
  assert.ok(html.includes('notice notice-tracked'));
  assert.ok(!html.includes('Direct Competitors'));
  assert.ok(html.includes('A &lt;b&gt;test&lt;/b&gt; company.'), 'company summary must be escaped');
});

test('stale data shows a notice', () => {
  const html = renderProfile({ ...stock, stale: true, staleSince: '2026-09-20T21:00:00Z' }, profile, THEMES);
  assert.match(html, /couldn't be refreshed.*Sep 20, 2026/);
});

test('theme and calendar pages render', () => {
  const profiles = { TEST: profile };
  const theme = renderTheme('Obesity & Metabolic', { reviewed: '2026-09-23', summary: 'Summary.', sections: [{ heading: 'Biology', body: '<p>GLP-1.</p>' }] }, [stock], profiles, THEMES);
  assert.ok(theme.includes('The Science') && theme.includes('Phase 3 data') && theme.includes('1 company tracked'));

  const cal = renderCalendar([stock], profiles, THEMES);
  assert.ok(cal.includes('Phase 3 data') && cal.includes('Quarterly earnings'));
  assert.ok(cal.includes('data-themes="Obesity &amp; Metabolic"'));
});
