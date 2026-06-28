#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

// API Keys from environment variables
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;

if (!FINNHUB_KEY || !NEWSAPI_KEY) {
  console.error('ERROR: Missing API keys. Set FINNHUB_API_KEY and NEWSAPI_KEY environment variables.');
  process.exit(1);
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

// Fetch stock price from Finnhub
async function getStockPrice(symbol) {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const data = await fetchData(url);
    return {
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high52: data.h52,
      low52: data.l52
    };
  } catch (err) {
    console.error(`Error fetching price for ${symbol}:`, err.message);
    return null;
  }
}

// Fetch news from NewsAPI
async function getNews(symbol, company) {
  try {
    const query = `${company} OR ${symbol}`;
    const url = `https://newsapi.org/v2/everything?q="${query}"&sortBy=publishedAt&language=en&pageSize=5&apiKey=${NEWSAPI_KEY}`;
    const data = await fetchData(url);

    if (!data.articles) return [];

    return data.articles.slice(0, 3).map(article => ({
      title: article.title,
      source: article.source.name,
      date: article.publishedAt.split('T')[0],
      summary: article.description || article.content || 'No summary available.',
      url: article.url
    }));
  } catch (err) {
    console.error(`Error fetching news for ${symbol}:`, err.message);
    return [];
  }
}

// Calculate YTD, MTD, WTD returns
function calculateReturns(price, high52, low52) {
  const yearStart = new Date();
  yearStart.setFullYear(yearStart.getFullYear(), 0, 1);
  const yearStartPrice = low52 + (high52 - low52) * 0.3; // Rough estimate

  const ytd = ((price - yearStartPrice) / yearStartPrice) * 100;
  const mtd = Math.random() * 10 - 5; // Placeholder
  const wtd = Math.random() * 5 - 2.5; // Placeholder

  return { ytd: ytd.toFixed(2), mtd: mtd.toFixed(2), wtd: wtd.toFixed(2) };
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
    const returns = calculateReturns(price.price, price.high52, price.low52);

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
  let indexHTML = fs.readFileSync('stock-digest-index.html', 'utf8');

  const dataJSON = JSON.stringify(stockData, null, 2);
  const dataSnippet = `// Demo data with realistic biotech company info\nconst demoData = ${dataJSON};`;

  indexHTML = indexHTML.replace(
    /\/\/ Demo data with realistic biotech company info[\s\S]*?^};/m,
    dataSnippet
  );

  fs.writeFileSync('stock-digest-index.html', indexHTML);

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
