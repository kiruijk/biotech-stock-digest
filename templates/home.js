// Static pieces of index.html written by update-stocks.js: SEO head tags, plus plain-HTML
// versions of the stock list and news feed. The page's script replaces the lists with the
// interactive versions on load; the static copies are what search engines and no-JS
// visitors see.

const { escapeHtml, formatPct } = require('./profile');

function renderHomeHead(site) {
  return `  <meta name="description" content="${escapeHtml(site.description)}">
  <meta property="og:title" content="${escapeHtml(site.name)} — Clinical-Stage Biotech Tracker">
  <meta property="og:description" content="${escapeHtml(site.description)}">
  <meta property="og:type" content="website">
  <link rel="canonical" href="${site.url}">
  <meta property="og:url" content="${site.url}">
  <meta property="og:site_name" content="${escapeHtml(site.name)}">`;
}

// Stocks by 1-day change, as a plain list of links
function renderStaticStocks(stocks) {
  const ranked = [...stocks].sort((a, b) => (b.changePercent ?? -Infinity) - (a.changePercent ?? -Infinity));
  return `<ol class="static-list">
${ranked.map(s => `          <li><a href="stocks/${s.symbol.toLowerCase()}.html">${s.symbol} — ${escapeHtml(s.name)}</a> ${s.price == null ? '' : `$${s.price.toFixed(2)}`} (${formatPct(s.changePercent)} today)</li>`).join('\n')}
        </ol>`;
}

// Latest headlines across all stocks, newest first
function renderStaticNews(stocks, limit = 25) {
  const byUrl = new Map();
  for (const s of stocks) {
    for (const n of (s.news || []).slice(0, 3)) {
      if (!n.url || n.url === '#') continue;
      if (!byUrl.has(n.url)) byUrl.set(n.url, { ...n, tickers: [] });
      byUrl.get(n.url).tickers.push(s.symbol);
    }
  }
  const news = [...byUrl.values()].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
  return `<ul class="static-list">
${news.map(n => `          <li>${n.tickers.join(', ')}: <a href="${escapeHtml(n.url)}" rel="noopener">${escapeHtml(n.title)}</a> (${escapeHtml(n.source)})</li>`).join('\n')}
        </ul>`;
}

module.exports = { renderHomeHead, renderStaticStocks, renderStaticNews };
