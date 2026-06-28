#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

// API Keys from environment variables
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

if (!FINNHUB_KEY) {
  console.error('ERROR: Missing FINNHUB_API_KEY. Set FINNHUB_API_KEY environment variable.');
  process.exit(1);
}

if (!NEWSAPI_KEY) {
  console.warn('⚠️  NEWSAPI_KEY not set. Will use fallback demo news.');
}

const STOCKS = ['VKNG', 'IOVA'];

// Fetch data from API
function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Fallback demo prices
const demoPrices = {
  VKNG: { price: 38.04, change: 1.25, changePercent: 3.39, high52: 45.20, low52: 12.50 },
  IOVA: { price: 4.25, change: -0.18, changePercent: -4.06, high52: 11.50, low52: 3.80 }
};

// Fetch stock price from Finnhub
async function getStockPrice(symbol) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const data = await fetchData(url);

    // Check if we got valid data
    if (!data || data.c === undefined) {
      console.warn(`⚠️  No data from API for ${symbol}, using fallback price`);
      return demoPrices[symbol];
    }

    return {
      price: data.c || demoPrices[symbol].price,
      change: data.d || demoPrices[symbol].change,
      changePercent: data.dp || demoPrices[symbol].changePercent,
      high52: data.h52 || demoPrices[symbol].high52,
      low52: data.l52 || demoPrices[symbol].low52
    };
  } catch (err) {
    console.warn(`⚠️  Error fetching price for ${symbol}: ${err.message}`);
    console.warn(`   Using fallback price`);
    return demoPrices[symbol];
  }
}

// Fallback news
const demoNews = {
  VKNG: [
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
  ]
};

// Fetch news from NewsAPI
async function getNews(symbol, company) {
  // If no API key, use demo news
  if (!NEWSAPI_KEY) {
    console.log(`  Using demo news for ${symbol} (no NEWSAPI_KEY)`);
    return demoNews[symbol] || [];
  }

  try {
    const query = `${company}`;
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=3&apiKey=${NEWSAPI_KEY}`;
    const data = await fetchData(url);

    if (!data.articles || data.articles.length === 0) {
      console.warn(`⚠️  No news found for ${symbol}, using demo news`);
      return demoNews[symbol] || [];
    }

    console.log(`✓ NewsAPI returned ${data.articles.length} articles for ${symbol}`);

    const articles = data.articles.slice(0, 3).map(article => ({
      title: article.title,
      source: article.source.name || 'News Source',
      date: article.publishedAt.split('T')[0],
      summary: article.description || article.content || 'No summary available.',
      url: article.url  // NewsAPI returns this as 'url'
    }));

    // Debug: log first article to check URL
    if (articles.length > 0) {
      console.log(`  First article URL: ${articles[0].url}`);
    }

    return articles;
  } catch (err) {
    console.warn(`⚠️  Error fetching news for ${symbol}: ${err.message}`);
    console.warn(`   Using demo news`);
    return demoNews[symbol] || [];
  }
}

// Calculate YTD, MTD, WTD returns from historical candle data
async function calculateReturns(symbol, currentPrice) {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1); // Jan 1
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of month
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)

    const toTimestamp = Math.floor(Date.now() / 1000);

    // Fetch year-to-date candles
    const ytdFrom = Math.floor(yearStart.getTime() / 1000);
    const ytdUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${ytdFrom}&to=${toTimestamp}&token=${FINNHUB_KEY}`;
    const ytdData = await fetchData(ytdUrl);

    let ytd = 0;
    if (ytdData.o && ytdData.o.length > 0) {
      const yearOpenPrice = ytdData.o[0]; // First candle's open
      ytd = ((currentPrice - yearOpenPrice) / yearOpenPrice) * 100;
    }

    // Fetch month-to-date candles
    const mtdFrom = Math.floor(monthStart.getTime() / 1000);
    const mtdUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${mtdFrom}&to=${toTimestamp}&token=${FINNHUB_KEY}`;
    const mtdData = await fetchData(mtdUrl);

    let mtd = 0;
    if (mtdData.o && mtdData.o.length > 0) {
      const monthOpenPrice = mtdData.o[0];
      mtd = ((currentPrice - monthOpenPrice) / monthOpenPrice) * 100;
    }

    // Fetch week-to-date candles
    const wtdFrom = Math.floor(weekStart.getTime() / 1000);
    const wtdUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${wtdFrom}&to=${toTimestamp}&token=${FINNHUB_KEY}`;
    const wtdData = await fetchData(wtdUrl);

    let wtd = 0;
    if (wtdData.o && wtdData.o.length > 0) {
      const weekOpenPrice = wtdData.o[0];
      wtd = ((currentPrice - weekOpenPrice) / weekOpenPrice) * 100;
    }

    console.log(`  Returns: YTD=${ytd.toFixed(2)}%, MTD=${mtd.toFixed(2)}%, WTD=${wtd.toFixed(2)}%`);

    return { ytd: parseFloat(ytd.toFixed(2)), mtd: parseFloat(mtd.toFixed(2)), wtd: parseFloat(wtd.toFixed(2)) };
  } catch (err) {
    console.warn(`⚠️  Error calculating returns for ${symbol}: ${err.message}`);
    return { ytd: 0, mtd: 0, wtd: 0 };
  }
}

// Update HTML with new data
async function updateHTML() {
  const stockData = {};

  console.log('Fetching stock data...');

  for (const symbol of STOCKS) {
    console.log(`  ${symbol}...`);
    const price = await getStockPrice(symbol);

    if (!price) {
      console.warn(`  Failed to fetch price for ${symbol}`);
      continue;
    }

    const company = symbol === 'VKNG' ? 'Vikings Therapeutics' : 'Iovance Biotherapeutics';
    const news = await getNews(symbol, company);
    const returns = await calculateReturns(symbol, price.price);

    stockData[symbol] = {
      symbol,
      name: company,
      price: parseFloat(price.price.toFixed(2)),
      change: parseFloat(price.change.toFixed(2)),
      changePercent: parseFloat(price.changePercent.toFixed(2)),
      ytd: parseFloat(returns.ytd),
      mtd: parseFloat(returns.mtd),
      wtd: parseFloat(returns.wtd),
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

  // Update index.html
  console.log('\nUpdating index.html...');
  let indexHTML = fs.readFileSync('index.html', 'utf8');

  const dataJSON = JSON.stringify(stockData, null, 2);
  const dataSnippet = `// Demo data with realistic biotech company info\nconst demoData = ${dataJSON};`;

  indexHTML = indexHTML.replace(
    /\/\/ Demo data with realistic biotech company info[\s\S]*?^};/m,
    dataSnippet
  );

  fs.writeFileSync('index.html', indexHTML);

  // Update profile pages
  console.log('Updating profile pages...');

  if (stockData.VKNG) {
    updateProfilePage('vkng.html', stockData.VKNG);
  }
  if (stockData.IOVA) {
    updateProfilePage('iova.html', stockData.IOVA);
  }

  console.log('\n✅ Stock data updated successfully!');
  console.log(`VKNG: $${stockData.VKNG?.price} ${stockData.VKNG?.changePercent >= 0 ? '+' : ''}${stockData.VKNG?.changePercent}%`);
  console.log(`IOVA: $${stockData.IOVA?.price} ${stockData.IOVA?.changePercent >= 0 ? '+' : ''}${stockData.IOVA?.changePercent}%`);
}

// Update individual profile page
function updateProfilePage(filename, data) {
  let html = fs.readFileSync(filename, 'utf8');

  // Update price in header metric
  html = html.replace(
    /<div class="metric-value">\$[\d.]+<\/div>(\s*<\/div>\s*<div class="metric">[\s\S]*?Current Price)/,
    `<div class="metric-value">$${data.price}</div>$1`
  );

  // Update last updated timestamp in a comment (optional)
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
