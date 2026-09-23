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
  VKTX: 'Vikings Therapeutics',
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

// Fallback demo prices
const demoPrices = {
  VKTX: { price: 38.04, change: 1.25, changePercent: 3.39, high52: 45.20, low52: 12.50 },
  IOVA: { price: 4.25, change: -0.18, changePercent: -4.06, high52: 11.50, low52: 3.80 },
  REPL: { price: 24.00, change: 0.50, changePercent: 2.13, high52: 35.00, low52: 14.00 },
  KLRA: { price: 12.73, change: -0.06, changePercent: -0.47, high52: 28.23, low52: 11.84 },
  NTLA: { price: 12.13, change: -0.56, changePercent: -4.45, high52: 28.25, low52: 7.95 },
  CGON: { price: 72.30, change: -5.44, changePercent: -7.00, high52: 80.97, low52: 35.64 },
  IMCR: { price: 31.40, change: -1.02, changePercent: -3.15, high52: 40.72, low52: 27.55 }
};

// Fetch stock price from Yahoo Finance using yahoo-finance2
async function getStockPrice(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);

    return {
      price: quote.regularMarketPrice || demoPrices[symbol].price,
      change: (quote.regularMarketPrice || 0) - (quote.regularMarketPreviousClose || 0),
      changePercent: quote.regularMarketChangePercent || demoPrices[symbol].changePercent,
      high52: quote.fiftyTwoWeekHigh || demoPrices[symbol].high52,
      low52: quote.fiftyTwoWeekLow || demoPrices[symbol].low52
    };
  } catch (err) {
    console.warn(`⚠️  Error fetching price for ${symbol}: ${err.message}`);
    console.warn(`   Using fallback price`);
    return demoPrices[symbol];
  }
}

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
      title: 'Vikings Therapeutics Presents Phase 2 Data for VK2735 in Obesity',
      source: 'BioSpace',
      date: new Date().toISOString().split('T')[0],
      summary: 'Vikings Therapeutics announced positive Phase 2 data for VK2735, demonstrating meaningful weight loss in obese patients.',
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
        date: new Date(item.providerPublishTime * 1000).toISOString().split('T')[0],
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

    while ((match = itemRegex.exec(xml)) !== null && items.length < 3) {
      const item = match[1];
      const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || '';
      const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '#';
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
      const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || 'Google News';
      const date = pubDate ? new Date(pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      if (title && link !== '#') {
        items.push({ title, source, date, summary: `Latest news about ${company}.`, url: link });
      }
    }

    return items;
  } catch (err) {
    return [];
  }
}

// Combine news from multiple sources
async function getNews(symbol, company) {
  try {
    const yahooNews = await getYahooNews(symbol);
    const googleNews = await getGoogleNews(company);
    const allNews = [...yahooNews, ...googleNews];

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

// Fetch returns from Yahoo Finance (1D, 5D, 1M, 6M, YTD)
async function getReturns(symbol, quote, currentPrice) {
  try {
    const now = new Date();

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 7); // 7 calendar days covers 5 trading days

    const yearStart = new Date(now.getFullYear(), 0, 1);

    const returns = {
      oneDay: parseFloat((quote.regularMarketChangePercent || 0).toFixed(2)),
      fiveDay: 0,
      oneMonth: 0,
      sixMonth: 0,
      ytd: 0
    };

    // Fetch back to whichever is earlier (Jan 1 or 6 months ago) so both 6M and YTD are covered
    const historyStart = yearStart < sixMonthsAgo ? yearStart : sixMonthsAgo;
    const historicalData = await getHistoricalData(symbol, historyStart);

    if (historicalData && historicalData.length > 0) {
      // Sort oldest → newest
      const sorted = [...historicalData].sort((a, b) => new Date(a.date) - new Date(b.date));

      // Use .close for return calculations (most recent price of that day)
      const calcReturn = (pastClose) =>
        parseFloat((((currentPrice - pastClose) / pastClose) * 100).toFixed(2));

      // 6M, 1M, 5D: most recent quote on or before the target date
      // (falls back to the oldest quote for recent IPOs with shorter history)
      const findClosest = (targetDate) =>
        [...sorted].reverse().find(q => new Date(q.date) <= targetDate) || sorted[0];

      const sixMonthQuote = findClosest(sixMonthsAgo);
      if (sixMonthQuote?.close) returns.sixMonth = calcReturn(sixMonthQuote.close);

      const oneMonthQuote = findClosest(oneMonthAgo);
      if (oneMonthQuote?.close) returns.oneMonth = calcReturn(oneMonthQuote.close);

      const fiveDayQuote = findClosest(fiveDaysAgo);
      if (fiveDayQuote?.close) returns.fiveDay = calcReturn(fiveDayQuote.close);

      const ytdQuote = sorted.find(q => new Date(q.date) >= yearStart);
      if (ytdQuote?.close) returns.ytd = calcReturn(ytdQuote.close);
    }

    console.log(`    1D: ${returns.oneDay}% | 5D: ${returns.fiveDay}% | 1M: ${returns.oneMonth}% | 6M: ${returns.sixMonth}% | YTD: ${returns.ytd}%`);
    return returns;
  } catch (err) {
    console.warn(`⚠️  Error fetching returns for ${symbol}: ${err.message}`);
    return { oneDay: 0, fiveDay: 0, oneMonth: 0, sixMonth: 0, ytd: 0 };
  }
}

// Update HTML with new data
// Cash positions from latest quarterly filings (Yahoo Finance balance sheet unavailable)
const cashPositions = {
  VKTX: 185e6,  // Q1 2026: $185M
  IOVA: 75e6,   // Q1 2026: $75M
  REPL: 350e6,  // Q1 2026: $350M
  KLRA: 1171.8e6, // Q2 2026: $1,171.8M (cash, equivalents & marketable securities)
  NTLA: 628.4e6,  // Q2 2026: $628.4M (cash, equivalents & marketable securities)
  CGON: 1028e6,   // Q2 2026: $1,028M (cash, equivalents & marketable securities)
  IMCR: 880.2e6,  // Q2 2026: $880.2M (cash, equivalents & marketable securities)
  // All below: Q2 2026 (June 30) cash, equivalents & marketable securities unless noted
  GPCR: 1.3e9,     // $1.3B
  ALT: 519e6,      // $519M
  WVE: 490.6e6,    // $490.6M
  SEPN: 516.5e6,   // $516.5M
  AUTL: 201.6e6,   // $201.6M
  ALLO: 423.6e6,   // $423.6M
  IMTX: 448.2e6,   // $448.2M (€393.4M)
  JANX: 970.9e6,   // $970.9M
  CADL: 201.6e6,   // $201.6M
  ENGN: 266.3e6,   // $266.3M as of July 31, 2026 (fiscal Q3)
  URGN: 108.0e6,   // $108.0M
  ONCY: 4.1e6,     // $4.1M
  CRSP: 2.36e9,    // $2.36B
  BEAM: 1.2e9,     // $1.2B
  PRME: 108.8e6,   // $108.8M (incl. restricted cash)
  CRBU: 113.8e6,   // $113.8M
  IDYA: 1.24e9,    // ~$1.24B
  VIR: 1.01e9,     // ~$1.01B
  CTMX: 330.3e6,   // $330.3M
  CMPX: 180e6      // $180M
};

async function getCashPosition(symbol) {
  return cashPositions[symbol] || null;
}

// Fetch monthly burn rate from quarterly net income (Yahoo Finance)
async function getMonthlyBurn(symbol) {
  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ['cashflowStatementHistoryQuarterly']
    });
    const stmt = summary.cashflowStatementHistoryQuarterly?.cashflowStatements?.[0];
    if (stmt && stmt.netIncome && stmt.netIncome < 0) {
      const monthly = Math.abs(stmt.netIncome) / 3;
      console.log(`    Monthly burn (${symbol}): $${(monthly / 1e6).toFixed(1)}M/month`);
      return monthly;
    }
    return null;
  } catch (err) {
    console.warn(`    ⚠️  Could not fetch burn rate for ${symbol}`);
    return null;
  }
}

async function updateHTML() {
  const stockData = {};

  console.log('Fetching stock data...');

  for (const symbol of STOCKS) {
    console.log(`  ${symbol}...`);
    let quote;
    try {
      quote = await yahooFinance.quote(symbol);
    } catch (err) {
      console.warn(`  Failed to fetch quote for ${symbol}: ${err.message}`);
      continue;
    }

    if (!quote) {
      console.warn(`  Failed to fetch quote for ${symbol}`);
      continue;
    }

    const price = {
      price: quote.regularMarketPrice || 0,
      change: (quote.regularMarketPrice || 0) - (quote.regularMarketPreviousClose || 0),
      changePercent: quote.regularMarketChangePercent || 0,
      marketCap: quote.marketCap || null
    };

    const company = COMPANY_NAMES[symbol] || symbol;
    const news = await getNews(symbol, company);
    const returns = await getReturns(symbol, quote, price.price);
    const monthlyBurn = await getMonthlyBurn(symbol);
    const cashPosition = await getCashPosition(symbol);

    stockData[symbol] = {
      symbol,
      name: company,
      price: parseFloat(price.price.toFixed(2)),
      change: parseFloat(price.change.toFixed(2)),
      changePercent: parseFloat(price.changePercent.toFixed(2)),
      marketCap: price.marketCap,
      monthlyBurn: monthlyBurn,
      cashPosition: cashPosition,
      oneDay: returns.oneDay,
      fiveDay: returns.fiveDay,
      oneMonth: returns.oneMonth,
      sixMonth: returns.sixMonth,
      ytd: returns.ytd,
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
    const filename = `${symbol.toLowerCase()}.html`;
    if (stockData[symbol] && fs.existsSync(filename)) {
      console.log(`  Updating ${filename}...`);
      updateProfilePage(filename, stockData[symbol]);
    }
  }

  console.log('\n✅ Stock data updated!');
  for (const symbol of STOCKS) {
    const d = stockData[symbol];
    if (d) console.log(`${symbol}: $${d.price} ${d.changePercent >= 0 ? '+' : ''}${d.changePercent}% | YTD: ${d.ytd}%`);
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

  // Update YTD: value and color
  html = html.replace(
    /(<div class="card-value"[^>]*data-field="ytd"[^>]*style="color: )#[0-9a-f]+(;?">)[^<]*/,
    (_, pre, close) => `${pre}${color(data.ytd)}${close}${sign(data.ytd)}${data.ytd}%`
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
