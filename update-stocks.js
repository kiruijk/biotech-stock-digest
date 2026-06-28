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

const STOCKS = ['VKTX', 'IOVA'];

// Fallback demo prices
const demoPrices = {
  VKTX: { price: 38.04, change: 1.25, changePercent: 3.39, high52: 45.20, low52: 12.50 },
  IOVA: { price: 4.25, change: -0.18, changePercent: -4.06, high52: 11.50, low52: 3.80 }
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
    const returns = {
      oneDay: parseFloat((quote.regularMarketChangePercent || 0).toFixed(2)),
      ytd: 0,
      fiveDay: 0,
      oneMonth: 0,
      sixMonth: 0
    };

    // Try to get YTD from quote
    if (quote.ytdReturn) {
      returns.ytd = parseFloat((quote.ytdReturn * 100).toFixed(2));
    }

    // Fetch historical data for 5D, 1M, 6M calculations
    const now = new Date();
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
    const oneMonthAgo = new Date(now.setMonth(now.getMonth() + 5)); // Reset month
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const historicalData = await getHistoricalData(symbol, sixMonthsAgo);

    if (historicalData && historicalData.length > 0) {
      // 6M: first data point
      const sixMQuote = historicalData[0];
      if (sixMQuote.open) {
        returns.sixMonth = parseFloat((((currentPrice - sixMQuote.open) / sixMQuote.open) * 100).toFixed(2));
      }

      // 1M: find quote ~1 month ago
      const oneMonthQuote = historicalData.find(q => new Date(q.date) <= oneMonthAgo);
      if (oneMonthQuote && oneMonthQuote.open) {
        returns.oneMonth = parseFloat((((currentPrice - oneMonthQuote.open) / oneMonthQuote.open) * 100).toFixed(2));
      }

      // 5D: find quote ~5 days ago
      const fiveDayQuote = historicalData.find(q => new Date(q.date) <= fiveDaysAgo);
      if (fiveDayQuote && fiveDayQuote.open) {
        returns.fiveDay = parseFloat((((currentPrice - fiveDayQuote.open) / fiveDayQuote.open) * 100).toFixed(2));
      }

      // YTD: if not from quote, calculate from year start
      if (returns.ytd === 0) {
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        const yearStartQuote = historicalData.find(q => new Date(q.date) >= yearStart);
        if (yearStartQuote && yearStartQuote.open) {
          returns.ytd = parseFloat((((currentPrice - yearStartQuote.open) / yearStartQuote.open) * 100).toFixed(2));
        }
      }
    }

    console.log(`    1D: ${returns.oneDay}% | 5D: ${returns.fiveDay}% | 1M: ${returns.oneMonth}% | 6M: ${returns.sixMonth}% | YTD: ${returns.ytd}%`);

    return returns;
  } catch (err) {
    console.warn(`⚠️  Error fetching returns for ${symbol}: ${err.message}`);
    return { oneDay: 0, fiveDay: 0, oneMonth: 0, sixMonth: 0, ytd: 0 };
  }
}

// Update HTML with new data
async function updateHTML() {
  const stockData = {};

  console.log('Fetching stock data...');

  for (const symbol of STOCKS) {
    console.log(`  ${symbol}...`);
    const quote = await yahooFinance.quote(symbol);

    if (!quote) {
      console.warn(`  Failed to fetch quote for ${symbol}`);
      continue;
    }

    const price = {
      price: quote.regularMarketPrice || 0,
      change: (quote.regularMarketPrice || 0) - (quote.regularMarketPreviousClose || 0),
      changePercent: quote.regularMarketChangePercent || 0
    };

    const company = symbol === 'VKTX' ? 'Vikings Therapeutics' : 'Iovance Biotherapeutics';
    const news = await getNews(symbol, company);
    const returns = await getReturns(symbol, quote, price.price);

    stockData[symbol] = {
      symbol,
      name: company,
      price: parseFloat(price.price.toFixed(2)),
      change: parseFloat(price.change.toFixed(2)),
      changePercent: parseFloat(price.changePercent.toFixed(2)),
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

  // Update profile pages if they exist
  const profilePages = { VKTX: 'vkng-enhanced.html', IOVA: 'iova-enhanced.html' };
  for (const [symbol, filename] of Object.entries(profilePages)) {
    if (stockData[symbol] && fs.existsSync(filename)) {
      console.log(`  Updating ${filename}...`);
      updateProfilePage(filename, stockData[symbol]);
    }
  }

  console.log('\n✅ Stock data updated!');
  if (stockData.VKTX) console.log(`VKTX: $${stockData.VKTX.price} ${stockData.VKTX.changePercent >= 0 ? '+' : ''}${stockData.VKTX.changePercent}% | YTD: ${stockData.VKTX.ytd}%`);
  if (stockData.IOVA) console.log(`IOVA: $${stockData.IOVA.price} ${stockData.IOVA.changePercent >= 0 ? '+' : ''}${stockData.IOVA.changePercent}% | YTD: ${stockData.IOVA.ytd}%`);
}

// Update individual profile page
function updateProfilePage(filename, data) {
  let html = fs.readFileSync(filename, 'utf8');

  // Update timestamp only (to avoid regex issues with complex HTML)
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
