// Renders a complete stock profile page (stocks/<ticker>.html) from:
//   stock   — fetched market data for one ticker (see buildStockData in update-stocks.js)
//   profile — editorial content from data/profiles/<ticker>.json, or null for a
//             data-only "tracked" stock
// Pages are fully static HTML so they work without JavaScript and can be indexed.

const fs = require('fs');
const path = require('path');

const { themeSlug } = require('../lib/themes');
const { NAV_CSS, renderNav, renderFooterLinks, seoTags } = require('./site');

const CSS = fs.readFileSync(path.join(__dirname, 'profile.css'), 'utf8');

const DISCLAIMER = 'For informational purposes only — not investment advice. Prices, returns and financials come from ' +
  'Yahoo Finance and company filings and may be delayed, incomplete or inaccurate. Company profiles are editorial ' +
  'summaries and may not reflect the latest developments. Do your own research and consult a licensed financial ' +
  'advisor before making investment decisions.';

const RETURN_LABELS = [
  ['1D', 'oneDay'], ['5D', 'fiveDay'], ['1M', 'oneMonth'], ['6M', 'sixMonth'], ['YTD', 'ytd'],
  ['1Y', 'oneYear'], ['3Y', 'threeYear'], ['5Y', 'fiveYear'], ['10Y', 'tenYear']
];

// Plain text from Yahoo/news is escaped; editorial content from data/profiles is trusted HTML
const escapeHtml = (s) => String(s ?? '')
  .replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const stripTags = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function formatMoney(value) {
  if (value == null) return 'N/A';
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  // One decimal under $10M so small amounts ($7.5M, $4.1M) aren't rounded away
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(Math.abs(value) < 1e7 ? 1 : 0)}M`;
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

const formatPct = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`);
const pctColor = (v) => (v == null ? '#6b7280' : v >= 0 ? '#059669' : '#dc2626');

function formatDate(iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : new Date(iso);
  return d.toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}

function burnText(stock) {
  if (stock.monthlyBurn) return `$${(stock.monthlyBurn / 1e6).toFixed(1)}M`;
  if (stock.cashFlowPositive) return 'Cash-flow positive';
  return 'N/A';
}

function runwayText(stock) {
  if (stock.cashPosition && stock.monthlyBurn) {
    const months = stock.cashPosition / stock.monthlyBurn;
    const rounded = Math.round(months);
    if (months > 120) return '10+ years';
    if (rounded < 1) return '<1 month';
    return `${rounded} month${rounded === 1 ? '' : 's'}`;
  }
  if (stock.cashFlowPositive) return 'No cash burn last qtr';
  return 'N/A';
}

// Summarize the last 6 months of insider buying and selling (Form 4 purchases include
// open-market buys and participation in offerings)
function insiderSummary(insiders) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 6);
  const recent = insiders.filter(t => new Date(t.date) >= cutoff);
  const buys = recent.filter(t => t.type === 'BUY');
  const sells = recent.filter(t => t.type === 'SELL');
  const total = (list) => list.reduce((sum, t) => sum + (t.value || 0), 0);

  if (!insiders.length) {
    return 'No insider transactions reported. Foreign private issuers are not required to file Form 4, so their insider trades may not appear here.';
  }
  const parts = [];
  parts.push(buys.length
    ? `${buys.length} purchase${buys.length === 1 ? '' : 's'} (${formatMoney(total(buys))})`
    : 'no purchases');
  parts.push(sells.length
    ? `${sells.length} sale${sells.length === 1 ? '' : 's'} (${formatMoney(total(sells))})`
    : 'no sales');
  let text = `Last 6 months: ${parts.join(' and ')}.`;
  if (buys.length && total(buys) > total(sells)) text += ' Net buying by insiders is generally read as a positive signal.';
  else if (sells.length && !buys.length) text += ' Sales are often routine (tax withholding on vested stock or pre-set trading plans).';
  return text;
}

const card = (inner) => `        <div class="card">\n${inner}\n        </div>`;

function statCard(label, value, field, extra = '') {
  return card(`          <div class="card-subtitle">${label}</div>${extra}
          <div class="card-value"${field ? ` data-field="${field}"` : ''}>${value}</div>`);
}

// themes: all theme names, for the site navigation
// siteUrl: public site root (data/site.json), for canonical/OG tags
function renderProfile(stock, profile, themes = [], siteUrl = null) {
  const covered = Boolean(profile);
  const company = stock.company || {};
  const title = `${stock.name} (${stock.symbol})`;
  const description = stripTags(covered ? profile.overview[0] : company.summary).slice(0, 300) ||
    `${stock.name} (${stock.symbol}) stock price, returns, cash runway, insider trades and news.`;
  const location = [company.city, company.state || company.country].filter(Boolean).join(', ');

  const sections = [];

  // Overview
  const overviewBody = covered
    ? profile.overview.map(p => `      <p class="para">${p}</p>`).join('\n') +
      `\n      <div class="meta-line">Analysis last reviewed ${formatDate(profile.reviewed)}.</div>`
    : `      <p class="para">${escapeHtml(company.summary || 'No company description available.')}</p>
      <div class="meta-line">Business description from Yahoo Finance.</div>`;
  sections.push(`    <!-- Company Overview -->
    <div class="section">
      <h2>Company Overview</h2>
${overviewBody}
${location || company.employees ? `      <div class="meta-line">${[location && `Headquarters: ${escapeHtml(location)}`, company.employees && `~${company.employees.toLocaleString('en-US')} employees`, company.website && `<a href="${escapeHtml(company.website)}" target="_blank" rel="noopener">${escapeHtml(company.website.replace(/^https?:\/\//, ''))}</a>`].filter(Boolean).join(' · ')}</div>` : ''}
    </div>`);

  // Quick stats + returns
  const ytdStyle = ` style="color: ${pctColor(stock.ytd)}"`;
  sections.push(`    <!-- Quick Stats -->
    <div class="section">
      <h2>Quick Stats</h2>
      <div class="grid-3">
${statCard('Stock Price', stock.price == null ? '—' : `$${stock.price.toFixed(2)}`, 'price')}
${statCard('Market Cap', formatMoney(stock.marketCap), 'marketCap')}
${statCard('Cash Position', formatMoney(stock.cashPosition), 'cashPosition')}
${card(`          <div class="card-subtitle">YTD Return</div>
          <div class="card-value" data-field="ytd"${ytdStyle}>${formatPct(stock.ytd)}</div>`)}
${statCard('Monthly Burn', burnText(stock) + (stock.monthlyBurn ? '/mo' : ''), 'monthlyBurn', '\n          <div class="card-subtitle">Operating cash outflow, latest qtr</div>')}
${statCard('Cash Runway', runwayText(stock), 'runway')}
      </div>
      <div class="returns">
${RETURN_LABELS.map(([label, field]) => `        <div class="return"><div class="return-label">${label}</div><div class="return-value" style="color: ${pctColor(stock[field])}">${formatPct(stock[field])}</div></div>`).join('\n')}
      </div>
      <div class="meta-line">Next earnings: ${stock.nextEarnings ? `<strong>${formatDate(stock.nextEarnings.date)}</strong>${stock.nextEarnings.estimated ? ' (estimated)' : ' (confirmed)'}` : 'not yet scheduled'}</div>
    </div>`);

  // Insider trading (automatic)
  const insiders = stock.insiders || [];
  const insiderRows = insiders.length
    ? insiders.map(t => {
      const cls = t.type === 'BUY' ? 'insider-buy' : t.type === 'SELL' ? 'insider-sell' : 'insider-other';
      const amount = [t.value ? formatMoney(t.value) : null, t.shares ? `${t.shares.toLocaleString('en-US')} shares` : null]
        .filter(Boolean).join(' · ');
      return `          <tr>
            <td>${escapeHtml(t.name)}</td>
            <td>${escapeHtml(t.relation)}</td>
            <td>${formatDate(t.date)}</td>
            <td><span class="${cls}">${t.type}</span></td>
            <td>${amount || '—'}</td>
          </tr>`;
    }).join('\n')
    : '          <tr><td colspan="5">No Form 4 insider transactions reported.</td></tr>';
  sections.push(`    <!-- Insider Trading -->
    <div class="section">
      <h2>Insider Trading Activity</h2>
      <div style="overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Insider</th>
            <th>Relationship</th>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
${insiderRows}
        </tbody>
      </table>
      </div>
      <p class="note"><strong>Summary:</strong> ${insiderSummary(insiders)} Source: SEC Form 4 filings via Yahoo Finance.</p>
    </div>`);

  if (covered) {
    sections.push(`    <!-- Competitors -->
    <div class="section">
      <h2>Direct Competitors</h2>
      <div class="grid-2">
${profile.competitors.map(c => card(`          <div class="card-title">${c.name}</div>
          <div class="card-subtitle">${c.product}</div>
          <div class="card-value" style="font-size: 0.9rem; margin-top: 0.5rem;">${c.note}</div>`)).join('\n')}
      </div>
      <p class="note"><strong>${stock.symbol} Advantage:</strong> ${profile.advantage}</p>
    </div>`);

    sections.push(`    <!-- Upcoming Catalysts -->
    <div class="section">
      <h2>Upcoming Catalysts</h2>
      <div class="grid-2">
${profile.catalysts.map(c => card(`          <div class="card-title">${c.title}</div>
          <div class="card-subtitle">${c.timing}</div>
          <div style="margin-top: 0.5rem;">${c.description}</div>
          <div style="margin-top: 0.5rem;"><span class="badge badge-${c.color}">${c.impact}</span></div>`)).join('\n')}
      </div>
      <div class="meta-line">Catalyst timing as of ${formatDate(profile.reviewed)}, based on company guidance.</div>
    </div>`);

    sections.push(`    <!-- Risk Factors -->
    <div class="section">
      <h2>Risk Factors</h2>
      <div class="grid-2">
${profile.risks.map(r => card(`          <div class="card-title">${r.title}</div>
          <div style="margin-top: 0.5rem;">${r.description}</div>
          <span class="badge badge-${r.level === 'HIGH' ? 'red' : 'yellow'}">${r.level} RISK</span>`)).join('\n')}
      </div>
    </div>`);

    sections.push(`    <!-- Strategic Partnerships -->
    <div class="section">
      <h2>Key Partnerships & Collaborations</h2>
      <div class="grid-2">
${profile.partners.map(p => card(`          <div class="card-title">${p.name}</div>
          <div class="card-subtitle">${p.role}</div>
          <div style="margin-top: 0.5rem;">${p.description}</div>`)).join('\n')}
      </div>
    </div>`);
  }

  // Financial health
  const cashAsOf = stock.cashAsOf ? `As of ${formatDate(stock.cashAsOf)} (cash + marketable securities)` : 'Latest reported quarter';
  sections.push(`    <!-- Financial Health -->
    <div class="section">
      <h2>Financial Health & Runway</h2>
      <div class="grid-2">
${card(`          <div class="card-title">Cash & Equivalents</div>
          <div class="card-value" data-field="cashPosition">${formatMoney(stock.cashPosition)}</div>
          <div class="card-subtitle" data-field="cashAsOf">${cashAsOf}</div>`)}
${card(`          <div class="card-title">Monthly Burn Rate</div>
          <div class="card-value" data-field="burnRate">${burnText(stock)}</div>
          <div class="card-subtitle">Latest quarter's operating cash outflow ÷ 3</div>`)}
${card(`          <div class="card-title">Estimated Runway</div>
          <div class="card-value" data-field="runway">${runwayText(stock)}</div>
          <div class="card-subtitle">At the latest quarter's burn rate</div>`)}
${card(`          <div class="card-title">Headcount</div>
          <div class="card-value">${company.employees ? `~${company.employees.toLocaleString('en-US')} employees` : 'N/A'}</div>
          <div class="card-subtitle">Full-time</div>`)}
      </div>
${covered ? `      <p class="note"><strong>Interpretation:</strong> ${profile.interpretation}</p>\n` : ''}    </div>`);

  // Leadership
  if (company.officers && company.officers.length) {
    sections.push(`    <!-- Leadership -->
    <div class="section">
      <h2>Leadership</h2>
      <ul class="item-list">
${company.officers.map(o => `        <li><strong>${escapeHtml(o.name)}</strong> <span class="item-meta">— ${escapeHtml(o.title)}</span></li>`).join('\n')}
      </ul>
    </div>`);
  }

  // News
  const news = (stock.news || []).filter(n => n.url && n.url !== '#');
  sections.push(`    <!-- Latest News -->
    <div class="section">
      <h2>Latest News</h2>
${news.length ? `      <ul class="item-list">
${news.map(n => `        <li><a href="${escapeHtml(n.url)}" target="_blank" rel="noopener">${escapeHtml(n.title)}</a><div class="item-meta">${escapeHtml(n.source)} · ${formatDate(n.date)}</div></li>`).join('\n')}
      </ul>` : '      <p class="note">No recent news.</p>'}
    </div>`);

  const notices = [];
  if (stock.stale) {
    notices.push(`    <div class="notice notice-stale">Market data couldn't be refreshed on the latest update; figures below are from ${formatDate(stock.staleSince || stock.updatedAt)}.</div>`);
  }
  if (!covered) {
    notices.push('    <div class="notice notice-tracked">Data-only page: prices, financials, insider trades and news update automatically. Editorial analysis (catalysts, risks, competitors) is not yet available for this company.</div>');
  }

  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Stock Profile | Life Science Investor</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)} — Stock Profile">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
${seoTags(siteUrl, `stocks/${stock.symbol.toLowerCase()}.html`)}
  <style>
${(CSS + NAV_CSS).replace(/^/gm, '    ').replace(/^\s+$/gm, '')}
  </style>
</head>

<body>
  <!-- Generated by update-stocks.js from data/profiles and live market data. Do not edit by hand. -->
  <!-- Last updated: ${stock.updatedAt || new Date().toISOString()} -->
${renderNav('../', themes)}

  <header>
    <div>
      <h1>${escapeHtml(title)}</h1>
      <div>${(stock.themes || []).map(t => `<a class="theme-tag" href="../themes/${themeSlug(t)}.html">${escapeHtml(t)}</a>`).join('')}</div>
    </div>
  </header>

  <div class="container">

${notices.join('\n')}${notices.length ? '\n\n' : ''}${sections.join('\n\n')}

  </div>

  <footer class="disclaimer">
${renderFooterLinks('../', themes)}
    <p>${DISCLAIMER}</p>
  </footer>

</body>

</html>
`;
}

module.exports = { renderProfile, formatMoney, formatPct, pctColor, formatDate, runwayText, escapeHtml, stripTags, CSS, DISCLAIMER };
