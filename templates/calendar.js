// Renders calendar.html: every upcoming catalyst (from data/profiles) and earnings date
// (from market data) across all tracked stocks. Items with an exact date in the next 30 days
// are listed first; everything else is grouped by half-year using the latest date the
// catalyst could fall on (lib/catalyst-timing.js). A small script filters by theme.

const { parseTimingEnd, isPast } = require('../lib/catalyst-timing');
const { formatDate, escapeHtml, CSS, DISCLAIMER } = require('./profile');
const { NAV_CSS, renderNav, renderFooterLinks } = require('./site');

const EXTRA_CSS = `
.cal-group h2 .count {
  font-size: 0.85rem;
  font-weight: 500;
  color: #6b7280;
  margin-left: 0.35rem;
}

.cal-item {
  display: grid;
  grid-template-columns: 9.5rem 1fr;
  gap: 0.75rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.cal-item:last-child {
  border-bottom: none;
}

.cal-when {
  font-weight: 600;
  color: #374151;
  font-size: 0.88rem;
}

.cal-kind {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  vertical-align: middle;
}

.cal-kind.earnings {
  background: #ede9fe;
  color: #6d28d9;
}

.cal-kind.catalyst {
  background: #e0ebff;
  color: #0052cc;
}

.cal-what a {
  color: #0052cc;
  font-weight: 700;
  text-decoration: none;
}

.cal-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 1.5rem;
}

.cal-filter button {
  padding: 0.35rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
}

.cal-filter button.active {
  background: #0052cc;
  border-color: #0052cc;
  color: white;
}

@media (max-width: 600px) {
  .cal-item {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }

  .cal-filter {
    flex-wrap: nowrap;
    overflow-x: auto;
  }

  .cal-filter button {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}
`;

const EXACT_DAY = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+20\d\d\b/i;

const halfLabel = (d) => `${d.getUTCMonth() < 6 ? '1H' : '2H'} ${d.getUTCFullYear()}`;

function renderCalendar(stocks, profiles, themes) {
  const today = new Date();
  const soonLimit = new Date(today.getTime() + 30 * 864e5);
  const items = [];

  for (const s of stocks) {
    for (const c of profiles[s.symbol]?.catalysts || []) {
      if (isPast(c.timing)) continue;
      const end = parseTimingEnd(c.timing);
      items.push({ kind: 'catalyst', stock: s, title: c.title, when: c.timing, end, exact: EXACT_DAY.test(c.timing), impact: c.impact, color: c.color });
    }
    if (s.nextEarnings) {
      const end = new Date(`${s.nextEarnings.date}T00:00:00Z`);
      items.push({
        kind: 'earnings', stock: s, title: 'Quarterly earnings',
        when: `${formatDate(s.nextEarnings.date)}${s.nextEarnings.estimated ? ' (est.)' : ''}`, end, exact: true
      });
    }
  }

  const byDate = (a, b) => (a.end ?? Infinity) - (b.end ?? Infinity) || a.stock.symbol.localeCompare(b.stock.symbol);
  const soon = items.filter(i => i.exact && i.end && i.end <= soonLimit).sort(byDate);
  const rest = items.filter(i => !soon.includes(i));
  const groups = new Map();
  for (const i of rest.filter(i => i.end).sort(byDate)) {
    const label = halfLabel(i.end);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(i);
  }
  const undated = rest.filter(i => !i.end).sort(byDate);

  const renderItem = (i) => `        <div class="cal-item" data-themes="${escapeHtml((i.stock.themes || []).join('|'))}">
          <div class="cal-when">${escapeHtml(i.when)}</div>
          <div class="cal-what">
            <a href="stocks/${i.stock.symbol.toLowerCase()}.html">${i.stock.symbol}</a> ${escapeHtml(i.stock.name)} — ${i.title}
            <span class="cal-kind ${i.kind}">${i.kind === 'earnings' ? 'EARNINGS' : 'CATALYST'}</span>${i.impact ? ` <span class="badge badge-${i.color}">${i.impact}</span>` : ''}
          </div>
        </div>`;

  const renderGroup = (title, list, note = '') => list.length ? `    <div class="section cal-group">
      <h2>${title}<span class="count">${list.length}</span></h2>
${note ? `      <p class="note" style="margin: -0.5rem 0 0.75rem;">${note}</p>\n` : ''}${list.map(renderItem).join('\n')}
    </div>` : '';

  const sections = [
    renderGroup('Next 30 Days', soon, 'Events with an exact date: earnings and dated catalysts.'),
    ...[...groups.entries()].map(([label, list]) => renderGroup(label, list, 'Grouped by the latest date each event could fall on, based on company guidance.')),
    renderGroup('Ongoing / Undated', undated)
  ].filter(Boolean);

  const description = `Upcoming clinical, regulatory and earnings catalysts for ${stocks.length} clinical-stage biotech stocks, grouped by date.`;

  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Biotech Catalyst &amp; Earnings Calendar | Life Science Investor</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="Biotech Catalyst &amp; Earnings Calendar — Life Science Investor">
  <meta property="og:description" content="${escapeHtml(description)}">
  <style>
${(CSS + NAV_CSS + EXTRA_CSS).replace(/^/gm, '    ').replace(/^\s+$/gm, '')}
  </style>
</head>

<body>
  <!-- Generated by update-stocks.js from data/profiles and live market data. Do not edit by hand. -->
${renderNav('', themes, 'calendar')}

  <header>
    <div>
      <h1>Catalyst &amp; Earnings Calendar</h1>
      <div>${items.length} upcoming events across ${stocks.length} stocks</div>
    </div>
  </header>

  <div class="container">

    <div class="cal-filter" id="cal-filter" role="group" aria-label="Filter by theme">
      <button type="button" class="active" data-theme="All">All</button>
${themes.map(t => `      <button type="button" data-theme="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('\n')}
    </div>

${sections.join('\n\n')}

    <p class="note">Catalyst timing comes from each company's profile and reflects company guidance as of that profile's review date. Earnings dates come from Yahoo Finance; "est." means the company hasn't confirmed the date.</p>

  </div>

  <footer class="disclaimer">
${renderFooterLinks('', themes)}
    <p>${DISCLAIMER}</p>
  </footer>

  <script>
    // Theme filter: hide items (and empty groups) outside the selected theme
    document.getElementById('cal-filter').addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const theme = btn.dataset.theme;
      document.querySelectorAll('#cal-filter button').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.cal-item').forEach(item => {
        item.hidden = theme !== 'All' && !item.dataset.themes.split('|').includes(theme);
      });
      document.querySelectorAll('.cal-group').forEach(group => {
        const visible = group.querySelectorAll('.cal-item:not([hidden])').length;
        group.hidden = visible === 0;
        const count = group.querySelector('.count');
        if (count) count.textContent = visible;
      });
    });
  </script>

</body>

</html>
`;
}

module.exports = { renderCalendar };
