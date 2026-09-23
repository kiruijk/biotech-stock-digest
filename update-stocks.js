#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

// Check if yahoo-finance2 is installed
let yahooFinance;
try {
  const YahooFinanceModule = require('yahoo-finance2').default || require('yahoo-finance2');
  // Try to instantiate or use directly
  yahooFinance = typeof YahooFinanceModule === 'function' ? new YahooFinanceModule({ suppressNotices: ['yahooSurvey', 'ripHistorical'] }) : YahooFinanceModule;
} catch (err) {
  console.error('ERROR: Failed to load yahoo-finance2');
  console.error(`  ${err.message}`);
  console.error('Make sure it\'s installed: npm install yahoo-finance2');
  process.exit(1);
}

const STOCKS = [
  'VKTX', 'IOVA', 'REPL', 'KLRA', 'NTLA', 'CGON', 'IMCR',
  'GPCR', 'ALT', 'WVE', 'SEPN', 'AUTL', 'ALLO', 'IMTX', 'JANX', 'CADL', 'ENGN',
  'URGN', 'ONCY', 'CRSP', 'BEAM', 'PRME', 'CRBU', 'IDYA', 'VIR', 'CTMX', 'CMPX'
];

const COMPANY_NAMES = {
  VKTX: 'Viking Therapeutics',
  IOVA: 'Iovance Biotherapeutics',
  REPL: 'Replimune Group',
  KLRA: 'Kailera Therapeutics',
  NTLA: 'Intellia Therapeutics',
  CGON: 'CG Oncology',
  IMCR: 'Immunocore',
  GPCR: 'Structure Therapeutics',
  ALT: 'Altimmune',
  WVE: 'Wave Life Sciences',
  SEPN: 'Septerna',
  AUTL: 'Autolus Therapeutics',
  ALLO: 'Allogene Therapeutics',
  IMTX: 'Immatics',
  JANX: 'Janux Therapeutics',
  CADL: 'Candel Therapeutics',
  ENGN: 'enGene Therapeutics',
  URGN: 'UroGen Pharma',
  ONCY: 'Oncolytics Biotech',
  CRSP: 'CRISPR Therapeutics',
  BEAM: 'Beam Therapeutics',
  PRME: 'Prime Medicine',
  CRBU: 'Caribou Biosciences',
  IDYA: 'IDEAYA Biosciences',
  VIR: 'Vir Biotechnology',
  CTMX: 'CytomX Therapeutics',
  CMPX: 'Compass Therapeutics'
};

// Fetch historical data from Yahoo Finance
async function getHistoricalData(symbol, startDate) {
  try {
    const endDate = new Date();
    const quotes = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });

    if (quotes && quotes.length > 0) {
      console.log(`    ✓ Got ${quotes.length} days of historical data for ${symbol}`);
      return quotes;
    } else {
      console.warn(`    ⚠️  No historical data for ${symbol}`);
      return null;
    }
  } catch (err) {
    console.warn(`    ⚠️  Error fetching historical data for ${symbol}: ${err.message}`);
    return null;
  }
}

// Fallback news
const demoNews = {
  REPL: [
    {
      title: 'Replimune Presents RP1 Phase 2 Data in Anti-PD1 Failed Melanoma',
      source: 'BioSpace',
      date: new Date().toISOString().split('T')[0],
      summary: 'Replimune shared updated IGNYTE trial data showing durable responses with vusolimogene oderparepvec plus pembrolizumab in patients who failed prior checkpoint therapy.',
      url: '#'
    }
  ],
  VKTX: [
    {
      title: 'Viking Therapeutics Presents Phase 2 Data for VK2735 in Obesity',
      source: 'BioSpace',
      date: new Date().toISOString().split('T')[0],
      summary: 'Viking Therapeutics announced positive Phase 2 data for VK2735, demonstrating meaningful weight loss in obese patients.',
      url: '#'
    }
  ],
  IOVA: [
    {
      title: 'Iovance Reports TIL Therapy Clinical Trial Results',
      source: 'Fierce Biotech',
      date: new Date().toISOString().split('T')[0],
      summary: 'Iovance Biotherapeutics shared updated data from its tumor infiltrating lymphocyte (TIL) therapy program showing durable responses.',
      url: '#'
    }
  ],
  KLRA: [
    {
      title: 'Kailera Reports Second Quarter 2026 Financial Results',
      source: 'GlobeNewswire',
      date: new Date().toISOString().split('T')[0],
      summary: 'Kailera advanced its global Phase 3 KaiNETIC program for ribupatide injection (KAI-9531), a GLP-1/GIP dual agonist for obesity.',
      url: '#'
    }
  ],
  NTLA: [
    {
      title: 'Intellia Presents Phase 3 HAELO Data for Lonvo-z in Hereditary Angioedema',
      source: 'GlobeNewswire',
      date: new Date().toISOString().split('T')[0],
      summary: 'A one-time infusion of the CRISPR-based therapy lonvo-z reduced HAE attacks by 87% versus placebo; Intellia expects FDA BLA acceptance in 2H 2026.',
      url: '#'
    }
  ],
  CGON: [
    {
      title: 'CG Oncology Nears BLA Completion for Cretostimogene in NMIBC',
      source: 'GlobeNewswire',
      date: new Date().toISOString().split('T')[0],
      summary: 'CG Oncology expects to complete its BLA for cretostimogene in high-risk BCG-unresponsive NMIBC in Q4 2026, with PIVOT-006 Phase 3 data near term.',
      url: '#'
    }
  ],
  IMCR: [
    {
      title: 'Immunocore Reports KIMMTRAK Revenue Growth in Q2 2026',
      source: 'GlobeNewswire',
      date: new Date().toISOString().split('T')[0],
      summary: 'KIMMTRAK net sales reached $115.9M, up 18% year over year, with Phase 3 TEBE-AM topline data expected by the end of 2026.',
      url: '#'
    }
  ]
};

// Fetch raw HTTP response (for RSS/HTML parsing)
function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    const follow = (u) => {
      const mod = u.startsWith('https') ? require('https') : require('http');
      mod.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return follow(res.headers.location);
        }
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      }).on('error', reject);
    };
    follow(url);
  });
}

// Fetch news from Yahoo Finance using yahoo-finance2
async function getYahooNews(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);

    if (quote.news && Array.isArray(quote.news)) {
      return quote.news.slice(0, 3).map(item => ({
        title: item.title,
        source: item.publisher || 'Yahoo Finance',
        date: new Date(item.providerPublishTime * 1000).toISOString(),
        summary: item.summary || 'Financial news',
        url: item.link
      }));
    }
    return [];
  } catch (err) {
    // Silently fail, we'll use Google News
    return [];
  }
}

// Fetch news from Google News RSS
async function getGoogleNews(company) {
  try {
    const query = encodeURIComponent(`${company} stock`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    const xml = await fetchRaw(url);
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    // Collect extra candidates so there are still enough after low-value items are filtered out
    while ((match = itemRegex.exec(xml)) !== null && items.length < 12) {
      const item = match[1];
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || '';
      const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '#';
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
      const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || 'Google News';
      const date = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();

      if (title && link !== '#') {
        items.push({ title, source, date, summary: `Latest news about ${company}.`, url: link });
      }
    }

    return items;
  } catch (err) {
    return [];
  }
}

// Headlines that aren't news: law-firm lawsuit solicitations, quote pages, and
// auto-generated "should you sell?" filler
const LOW_VALUE_NEWS = [
  /stock price,? news,? quote/i,
  /\b(Levi (&amp;|&) Korsinsky|Rosen Law|Pomerantz|Bragar Eagel|Faruqi|Bronstein, Gewirtz|Glancy Prongay|Kessler Topaz|Schall Law|Gross Law|Portnoy Law|Robbins Geller|Kirby McInerney|Johnson Fistel)\b/i,
  /\b(class action|investor alert|shareholder alert|securities fraud|investigation on behalf)\b/i,
  /\bDEADLINE\b/,
  /\bShould You (Buy|Sell)\b/i,
  /\b(Resistance|Support) Level\b/i,
  /\bstock (forecast|prediction)\b/i
];

const isLowValueNews = (item) => LOW_VALUE_NEWS.some(re => re.test(item.title));

// Combine news from multiple sources
async function getNews(symbol, company) {
  try {
    const yahooNews = await getYahooNews(symbol);
    const googleNews = await getGoogleNews(company);
    const allNews = [...yahooNews, ...googleNews].filter(item => !isLowValueNews(item));

    if (allNews.length === 0) {
      console.warn(`⚠️  No news found for ${symbol}, using demo news`);
      return demoNews[symbol] || [];
    }

    // Remove duplicates and sort by date (newest first)
    const uniqueNews = Array.from(new Map(allNews.map(item => [item.title, item])).values());
    uniqueNews.sort((a, b) => new Date(b.date) - new Date(a.date));

    const topNews = uniqueNews.slice(0, 3);
    console.log(`✓ Fetched ${topNews.length} articles from Yahoo Finance & Google News for ${symbol}`);
    if (topNews.length > 0) {
      console.log(`  Latest: ${topNews[0].title} (${topNews[0].date})`);
    }

    return topNews;
  } catch (err) {
    console.warn(`⚠️  Error fetching news for ${symbol}: ${err.message}`);
    console.warn(`   Using demo news`);
    return demoNews[symbol] || [];
  }
}

// Round to 2 decimals, passing null/undefined through as null
const round2 = (n) => (n == null ? null : parseFloat(n.toFixed(2)));

// Return periods shown on the dashboard. Each maps a field name to the date the
// return is measured from; 1D comes straight from the quote.
const RETURN_PERIODS = {
  fiveDay: (now) => daysAgo(now, 7),  // 7 calendar days covers 5 trading days
  oneMonth: (now) => monthsAgo(now, 1),
  sixMonth: (now) => monthsAgo(now, 6),
  ytd: (now) => new Date(now.getFullYear() - 1, 11, 31),  // last close of prior year
  oneYear: (now) => monthsAgo(now, 12),
  threeYear: (now) => monthsAgo(now, 36),
  fiveYear: (now) => monthsAgo(now, 60),
  tenYear: (now) => monthsAgo(now, 120)
};

function daysAgo(now, n) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

function monthsAgo(now, n) {
  const d = new Date(now);
  d.setMonth(d.getMonth() - n);
  return d;
}

// Fetch returns from Yahoo Finance for 1D plus every period in RETURN_PERIODS
async function getReturns(symbol, quote, currentPrice) {
  // null means "unavailable" (rendered as —), distinct from a real 0% return
  const returns = { oneDay: round2(quote.regularMarketChangePercent) };
  for (const field of Object.keys(RETURN_PERIODS)) returns[field] = null;

  try {
    const now = new Date();
    const targets = Object.fromEntries(
      Object.entries(RETURN_PERIODS).map(([field, getDate]) => [field, getDate(now)])
    );
    // Fetch a little before the oldest target so there's a close on or before it
    const historyStart = daysAgo(new Date(Math.min(...Object.values(targets))), 10);
    const historicalData = await getHistoricalData(symbol, historyStart);

    if (historicalData && historicalData.length > 0) {
      // Sort oldest → newest
      const sorted = historicalData
        .filter(q => q.close != null)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Most recent close on or before the target date. Returns null when the stock's
      // history doesn't reach back that far (e.g. a recent IPO), rather than silently
      // measuring from the first trading day.
      const closeAt = (target) => {
        const q = [...sorted].reverse().find(q => new Date(q.date) <= target);
        return q ? q.close : null;
      };

      for (const [field, target] of Object.entries(targets)) {
        const pastClose = closeAt(target);
        if (pastClose) returns[field] = round2(((currentPrice - pastClose) / pastClose) * 100);
      }
    }

    const fmt = (v) => (v == null ? '—' : `${v}%`);
    console.log(`    1D: ${fmt(returns.oneDay)} | 5D: ${fmt(returns.fiveDay)} | 1M: ${fmt(returns.oneMonth)} | 6M: ${fmt(returns.sixMonth)} | YTD: ${fmt(returns.ytd)} | 1Y: ${fmt(returns.oneYear)} | 3Y: ${fmt(returns.threeYear)} | 5Y: ${fmt(returns.fiveYear)} | 10Y: ${fmt(returns.tenYear)}`);
  } catch (err) {
    console.warn(`⚠️  Error fetching returns for ${symbol}: ${err.message}`);
  }
  return returns;
}

// Hand-entered cash figures (from the 10-Q) for companies where Yahoo's balance sheet
// is incomplete. Used only while at least as recent as Yahoo's latest quarter —
// update the amount and asOf date each quarter.
const cashOverrides = {
  PRME: { amount: 108.8e6, asOf: '2026-06-30' }  // Yahoo omits Prime's marketable securities
};

const fxRates = {};

// USD per unit of `currency`, e.g. EUR → ~1.14. Null if the rate can't be fetched.
async function getUsdRate(currency) {
  if (currency === 'USD') return 1;
  if (!(currency in fxRates)) {
    try {
      const fx = await yahooFinance.quote(`${currency}USD=X`);
      fxRates[currency] = fx?.regularMarketPrice ?? null;
    } catch (err) {
      console.warn(`    ⚠️  Could not fetch ${currency}/USD rate: ${err.message}`);
      fxRates[currency] = null;
    }
  }
  return fxRates[currency];
}

// Cash and burn from Yahoo's quarterly statements:
// - cash = cash, equivalents & short-term investments + long-term marketable securities
//   (excludes strategic equity stakes), matching what companies report in earnings releases
// - burn = latest quarter's operating cash outflow ÷ 3 (actual cash spent, unlike net loss
//   which includes non-cash items like stock comp and warrant revaluations)
async function getFinancials(symbol, currency) {
  const result = { cashPosition: null, cashAsOf: null, monthlyBurn: null, cashFlowPositive: false };

  try {
    const rows = await yahooFinance.fundamentalsTimeSeries(symbol, {
      period1: daysAgo(new Date(), 400),
      type: 'quarterly',
      module: 'all'
    });
    const latest = (field) => [...rows].reverse().find(r => r[field] != null);
    const fx = await getUsdRate(currency || 'USD');

    const bs = latest('cashCashEquivalentsAndShortTermInvestments');
    if (bs && fx) {
      const longTerm = bs.investmentinFinancialAssets ?? bs.investmentsAndAdvances ?? 0;
      result.cashPosition = (bs.cashCashEquivalentsAndShortTermInvestments + longTerm) * fx;
      result.cashAsOf = new Date(bs.date).toISOString().slice(0, 10);
    }

    const cf = latest('operatingCashFlow');
    if (cf && fx) {
      if (cf.operatingCashFlow < 0) result.monthlyBurn = (-cf.operatingCashFlow * fx) / 3;
      else result.cashFlowPositive = true;
    }
  } catch (err) {
    console.warn(`    ⚠️  Could not fetch financials for ${symbol}: ${err.message}`);
  }

  const override = cashOverrides[symbol];
  if (override && (!result.cashAsOf || override.asOf >= result.cashAsOf)) {
    result.cashPosition = override.amount;
    result.cashAsOf = override.asOf;
  }

  const m = (v) => (v == null ? '—' : `$${(v / 1e6).toFixed(1)}M`);
  console.log(`    Cash: ${m(result.cashPosition)} (as of ${result.cashAsOf ?? '—'}) | Burn: ${result.cashFlowPositive ? 'cash-flow positive' : `${m(result.monthlyBurn)}/mo`}`);
  return result;
}

// Read the data embedded in index.html by the previous run, so a ticker whose
// fetch fails can keep its last good values (flagged stale) instead of disappearing
function readPreviousData() {
  try {
    const html = fs.readFileSync('index.html', 'utf8');
    const match = html.match(/const demoData = (\{[\s\S]*?^\s*\});/m);
    return match ? JSON.parse(match[1]) : {};
  } catch (err) {
    console.warn(`⚠️  Could not read previous data from index.html: ${err.message}`);
    return {};
  }
}

async function updateHTML() {
  const stockData = {};
  const previousData = readPreviousData();

  const keepPrevious = (symbol) => {
    const prev = previousData[symbol];
    if (!prev) return;
    console.warn(`  Keeping last good data for ${symbol} (marked stale)`);
    stockData[symbol] = { ...prev, stale: true, staleSince: prev.staleSince || prev.updatedAt || null };
  };

  console.log('Fetching stock data...');

  for (const symbol of STOCKS) {
    console.log(`  ${symbol}...`);
    let quote;
    try {
      quote = await yahooFinance.quote(symbol);
    } catch (err) {
      console.warn(`  Failed to fetch quote for ${symbol}: ${err.message}`);
      keepPrevious(symbol);
      continue;
    }

    if (quote?.regularMarketPrice == null) {
      console.warn(`  No price in quote for ${symbol}`);
      keepPrevious(symbol);
      continue;
    }

    const price = {
      price: quote.regularMarketPrice,
      change: quote.regularMarketPreviousClose != null ? quote.regularMarketPrice - quote.regularMarketPreviousClose : null,
      changePercent: quote.regularMarketChangePercent ?? null,
      marketCap: quote.marketCap ?? null
    };

    const company = COMPANY_NAMES[symbol] || symbol;
    const news = await getNews(symbol, company);
    const returns = await getReturns(symbol, quote, price.price);
    const financials = await getFinancials(symbol, quote.financialCurrency);

    stockData[symbol] = {
      symbol,
      name: company,
      price: round2(price.price),
      change: round2(price.change),
      changePercent: round2(price.changePercent),
      updatedAt: new Date().toISOString(),
      marketCap: price.marketCap,
      ...financials,
      ...returns,
      news: news.length > 0 ? news : [
        {
          title: `${company} - No recent news`,
          source: 'Market Data',
          date: new Date().toISOString().split('T')[0],
          summary: 'Check back later for the latest news.',
          url: '#'
        }
      ]
    };
  }

  console.log('\nData calculated successfully');

  // Update index.html
  console.log('Updating index.html...');
  let indexHTML = fs.readFileSync('index.html', 'utf8');
  const dataJSON = JSON.stringify(stockData, null, 2)
    .replace(/^/gm, '      ')  // indent to match surrounding code
    .trim();
  indexHTML = indexHTML.replace(
    /const demoData = \{[\s\S]*?^\s*\};/m,
    `const demoData = ${dataJSON};`
  );
  fs.writeFileSync('index.html', indexHTML);

  // Update profile pages
  for (const symbol of STOCKS) {
    const filename = `stocks/${symbol.toLowerCase()}.html`;
    // Stale entries keep whatever the profile page already shows
    if (stockData[symbol] && !stockData[symbol].stale && fs.existsSync(filename)) {
      console.log(`  Updating ${filename}...`);
      updateProfilePage(filename, stockData[symbol]);
    }
  }

  console.log('\n✅ Stock data updated!');
  for (const symbol of STOCKS) {
    const d = stockData[symbol];
    if (d) console.log(`${symbol}: $${d.price} ${d.changePercent >= 0 ? '+' : ''}${d.changePercent}% | YTD: ${d.ytd == null ? '—' : d.ytd + '%'}${d.stale ? ' (STALE)' : ''}`);
  }
}

// Update individual profile page
function formatMarketCap(value) {
  if (!value) return 'N/A';
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

function updateProfilePage(filename, data) {
  let html = fs.readFileSync(filename, 'utf8');

  const sign = (n) => n >= 0 ? '+' : '';
  const color = (n) => n >= 0 ? '#059669' : '#dc2626';

  // Update price
  html = html.replace(
    /(<div class="card-value"[^>]*data-field="price"[^>]*>)[^<]*/,
    (_, tag) => `${tag}$${data.price}`
  );

  // Update market cap
  html = html.replace(
    /(<div class="card-value"[^>]*data-field="marketCap"[^>]*>)[^<]*/,
    (_, tag) => `${tag}${formatMarketCap(data.marketCap)}`
  );

  // Update monthly burn (Quick Stats card)
  // Burn cards: dollar figure, or a note when the company generated cash last quarter
  const burnText = data.monthlyBurn ? null : data.cashFlowPositive ? 'Cash-flow positive' : null;
  if (burnText) {
    html = html.replace(
      /(<div class="card-value"[^>]*data-field="(?:monthlyBurn|burnRate)"[^>]*>)[^<]*/g,
      (_, tag) => `${tag}${burnText}`
    );
  }

  if (data.monthlyBurn) {
    const burnStr = `$${(data.monthlyBurn / 1e6).toFixed(1)}M/mo`;
    html = html.replace(
      /(<div class="card-value"[^>]*data-field="monthlyBurn"[^>]*>)[^<]*/g,
      (_, tag) => `${tag}${burnStr}`
    );
  }

  // Update Financial Health section
  if (data.cashPosition) {
    html = html.replace(
      /(<div class="card-value"[^>]*data-field="cashPosition"[^>]*>)[^<]*/g,
      (_, tag) => `${tag}${formatMarketCap(data.cashPosition)}`
    );
  }
  if (data.cashAsOf) {
    const asOf = new Date(`${data.cashAsOf}T00:00:00Z`)
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    html = html.replace(
      /(<div class="card-subtitle"[^>]*data-field="cashAsOf"[^>]*>)[^<]*/g,
      (_, tag) => `${tag}As of ${asOf} (cash + marketable securities)`
    );
  }
  if (data.cashFlowPositive && !data.monthlyBurn) {
    html = html.replace(
      /(<div class="card-value"[^>]*data-field="runway"[^>]*>)[^<]*/g,
      (_, tag) => `${tag}No cash burn last qtr`
    );
  }
  if (data.monthlyBurn) {
    html = html.replace(
      /(<div class="card-value"[^>]*data-field="burnRate"[^>]*>)[^<]*/,
      (_, tag) => `${tag}$${(data.monthlyBurn / 1e6).toFixed(1)}M`
    );
  }
  if (data.cashPosition && data.monthlyBurn) {
    const runwayMonths = data.cashPosition / data.monthlyBurn;
    const months = Math.round(runwayMonths);
    const runwayStr = runwayMonths > 120 ? '10+ years'
      : months < 1 ? '<1 month'
      : `${months} month${months === 1 ? '' : 's'}`;
    html = html.replace(
      /(<div class="card-value"[^>]*data-field="runway"[^>]*>)[^<]*/g,
      (_, tag) => `${tag}${runwayStr}`
    );
  }

  // Update YTD: value and color (— in gray when the stock has no history back to Jan 1)
  html = html.replace(
    /(<div class="card-value"[^>]*data-field="ytd"[^>]*style="color: )#[0-9a-f]+(;?">)[^<]*/,
    (_, pre, close) => data.ytd == null
      ? `${pre}#6b7280${close}—`
      : `${pre}${color(data.ytd)}${close}${sign(data.ytd)}${data.ytd}%`
  );

  // Update timestamp
  const timestamp = new Date().toISOString();
  if (!html.includes('<!-- Last updated:')) {
    html = html.replace('<body>', `<body>\n<!-- Last updated: ${timestamp} -->`);
  } else {
    html = html.replace(/<!-- Last updated: [\d\-T:Z]+ -->/, `<!-- Last updated: ${timestamp} -->`);
  }

  fs.writeFileSync(filename, html);
}

// Run
updateHTML().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
