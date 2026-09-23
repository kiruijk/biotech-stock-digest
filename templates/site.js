// Shared site chrome: top navigation bar and footer links, used by every generated page
// and injected into index.html by update-stocks.js. `base` is the path back to the site
// root: '' for pages at the root, '../' for pages in stocks/ and themes/.

const { themeSlug } = require('../lib/themes');

const NAV_CSS = `
.site-nav {
  background: #0b1f44;
  color: white;
  font-size: 0.88rem;
}

.site-nav-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.55rem 1rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.site-nav a {
  color: #c7d7fe;
  text-decoration: none;
  font-weight: 600;
  white-space: nowrap;
}

.site-nav a:hover,
.site-nav a.current {
  color: white;
}

.site-nav .brand {
  color: white;
  font-weight: 800;
  margin-right: auto;
  letter-spacing: -0.01em;
}

.site-nav details {
  position: relative;
}

.site-nav summary {
  white-space: nowrap;
  cursor: pointer;
  color: #c7d7fe;
  font-weight: 600;
  list-style: none;
}

.site-nav summary::-webkit-details-marker {
  display: none;
}

.site-nav summary::after {
  content: ' ▾';
  font-size: 0.75rem;
}

.site-nav details[open] summary,
.site-nav summary:hover {
  color: white;
}

.site-nav .menu {
  position: absolute;
  right: 0;
  top: 1.9rem;
  z-index: 20;
  min-width: 230px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 0.4rem 0;
}

.site-nav .menu a {
  display: block;
  padding: 0.45rem 1rem;
  color: #1a1a1a;
  font-weight: 500;
}

.site-nav .menu a:hover {
  background: #f3f4f6;
  color: #0052cc;
}

.site-footer {
  border-top: 1px solid #e5e7eb;
  margin-top: 1rem;
  padding: 1.25rem 1rem 0.5rem;
  font-size: 0.82rem;
  line-height: 1.9;
}

.site-footer a {
  color: #4b5563;
  text-decoration: none;
  margin-right: 1rem;
  white-space: nowrap;
}

.site-footer a:hover {
  color: #0052cc;
}

.site-footer strong {
  color: #374151;
  margin-right: 0.75rem;
}

@media (max-width: 600px) {
  .site-nav-inner {
    gap: 0.9rem;
    padding: 0.5rem 0.75rem;
  }

  .site-nav .brand {
    font-size: 0.85rem;
  }

  /* The brand already links home */
  .site-nav .nav-home {
    display: none;
  }
}
`;

// current: 'dashboard' | 'calendar' | 'themes' | null
function renderNav(base, themes, current = null) {
  return `  <nav class="site-nav" aria-label="Site">
    <div class="site-nav-inner">
      <a class="brand" href="${base}index.html">Life Science Investor</a>
      <a class="nav-home${current === 'dashboard' ? ' current' : ''}" href="${base}index.html">Dashboard</a>
      <details>
        <summary${current === 'themes' ? ' class="current"' : ''}>Themes</summary>
        <div class="menu">
${themes.map(t => `          <a href="${base}themes/${themeSlug(t)}.html">${t}</a>`).join('\n')}
        </div>
      </details>
      <a href="${base}calendar.html"${current === 'calendar' ? ' class="current"' : ''}>Calendar</a>
    </div>
  </nav>`;
}

function renderFooterLinks(base, themes) {
  return `    <nav class="site-footer" aria-label="Site links">
      <div><strong>Life Science Investor</strong><a href="${base}index.html">Dashboard</a><a href="${base}calendar.html">Catalyst &amp; Earnings Calendar</a></div>
      <div><strong>Themes</strong>${themes.map(t => `<a href="${base}themes/${themeSlug(t)}.html">${t}</a>`).join('')}</div>
    </nav>`;
}

module.exports = { NAV_CSS, renderNav, renderFooterLinks };
