#!/usr/bin/env node

const fs = require('fs');
const https = require('https');

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

// Fetch stock price and historical data from Yahoo Finance
async function getStockPrice(symbol) {
  try {
    // Use Yahoo Finance API (no key required)
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,summaryDetail`;
    const data = await fetchData(url);

    if (!data.quoteSummary || !data.quoteSummary.result || !data.quoteSummary.result[0]) {
      console.warn(`⚠️  No data from Yahoo Finance for ${symbol}, using fallback price`);
      return demoPrices[symbol];
    }

    const result = data.quoteSummary.result[0];
    const price = result.price;
    const summary = result.summaryDetail;

    return {
      price: price.regularMarketPrice?.raw || demoPrices[symbol].price,
      change: (price.regularMarketPrice?.raw || 0) - (price.regularMarketPreviousClose?.raw || 0),
      changePercent: price.regularMarketChangePercent?.raw || demoPrices[symbol].changePercent,
      high52: summary.fiftyTwoWeekHigh?.raw || demoPrices[symbol].high52,
      low52: summary.fiftyTwoWeekLow?.raw || demoPrices[symbol].low52
    };
  } catch (err) {
    console.warn(`⚠️  Error fetching price for ${symbol}: ${err.message}`);
    console.warn(`   Using fallback price`);
    return demoPrices[symbol];
  }
}

// Fetch historical chart data from Yahoo Finance for returns calculation
async function getHistoricalData(symbol, startDate) {
  try {
    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(Date.now() / 1000);
    const url = `https://query1.finance.yahoo.com/v7/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;
    const data = await fetchData(url);

    if (data.chart?.result?.[0]?.timestamp) {
      return data.chart.result[0];
    }
    return null;
  } catch (err) {
    console.warn(`    ⚠️  Error fetching historical data for ${symbol}: ${err.message}`);
    return null;
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

// Fetch news from Yahoo Finance
async function getYahooNews(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=news`;
    const data = await fetchData(url);

    if (data.quoteSummary?.result?.[0]?.news?.news) {
      const news = data.quoteSummary.result[0].news.news;
      return news.slice(0, 3).map(item => ({
        title: item.title,
        source: item.publisher || 'Yahoo Finance',
        date: new Date(item.providerPublishTime * 1000).toISOString().split('T')[0],
        summary: item.summary || 'Financial news',
        url: item.link
      }));
    }
    return [];
  } catch (err) {
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

// Calculate YTD, MTD, WTD returns from historical data
async function calculateReturns(symbol, currentPrice) {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1); // Jan 1
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of month
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)

    // Fetch historical data from year start
    const chartData = await getHistoricalData(symbol, yearStart);

    let ytd = 0, mtd = 0, wtd = 0;

    if (chartData && chartData.timestamp && chartData.open) {
      const timestamps = chartData.timestamp;
      const opens = chartData.open;
      const closes = chartData.close;

      // YTD: from first data point
      if (opens.length > 0 && opens[0]) {
        const yearOpenPrice = opens[0];
        ytd = ((currentPrice - yearOpenPrice) / yearOpenPrice) * 100;
        console.log(`    YTD: ${yearOpenPrice} -> ${currentPrice} = ${ytd.toFixed(2)}%`);
      }

      // MTD: find first timestamp >= month start
      const mtdIndex = timestamps.findIndex(ts => new Date(ts * 1000) >= monthStart);
      if (mtdIndex >= 0 && opens[mtdIndex]) {
        const monthOpenPrice = opens[mtdIndex];
        mtd = ((currentPrice - monthOpenPrice) / monthOpenPrice) * 100;
        console.log(`    MTD: ${monthOpenPrice} -> ${currentPrice} = ${mtd.toFixed(2)}%`);
      }

      // WTD: find first timestamp >= week start
      const wtdIndex = timestamps.findIndex(ts => new Date(ts * 1000) >= weekStart);
      if (wtdIndex >= 0 && opens[wtdIndex]) {
        const weekOpenPrice = opens[wtdIndex];
        wtd = ((currentPrice - weekOpenPrice) / weekOpenPrice) * 100;
        console.log(`    WTD: ${weekOpenPrice} -> ${currentPrice} = ${wtd.toFixed(2)}%`);
      }
    } else {
      console.warn(`    ⚠️  No historical data for ${symbol}`);
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

  // Update timestamp in a comment
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
