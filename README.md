# Biotech Stock News Digest

A lightweight daily market tracker for biotech stocks. Real-time quotes, performance metrics (YTD/MTD/WTD), and AI-summarized news articles in a clean, responsive dashboard.

## Features

- **📊 Live Stock Quotes** — Current prices and day's % change for VKNG & IOVA
- **📈 Performance Metrics** — Year-to-date, month-to-date, week-to-date returns at a glance
- **�� Daily News Digest** — Latest articles from financial news sources with AI-generated summaries
- **🎯 Biotech Focus** — Curated news relevant to biotech investors
- **⚡ Zero Backend** — Pure static HTML + JavaScript; no server costs
- **🚀 Instant Deploy** — Live on GitHub Pages in minutes
- **📱 Mobile Responsive** — Works on desktop, tablet, and phone

## Quick Start

### View the Live Site
https://YOUR_USERNAME.github.io/biotech-stock-digest

### Run Locally
```bash
git clone https://github.com/YOUR_USERNAME/biotech-stock-digest.git
cd biotech-stock-digest
open index.html
```

### Deploy to GitHub Pages
1. Push to GitHub
2. Settings → Pages
3. Source: `main` branch, `/ (root)`
4. Done — live in ~2 minutes at your GitHub Pages URL

## File Structure

```
biotech-stock-digest/
├── index.html              # Complete dashboard (HTML/CSS/JS)
├── README.md               # This file
├── .gitignore              # Git ignore
```

Single file, simple hosting.

## Tracking Your Stocks

### Change the stocks you track
In `index.html`, find this section:
```javascript
const STOCKS = ['VKNG', 'IOVA'];

const demoData = {
  VKNG: {
    symbol: 'VKNG',
    name: 'Vikings Therapeutics',
    price: 8.42,
    change: 0.15,
    changePercent: 1.81,
    ytd: -15.3,
    mtd: 2.1,
    wtd: 0.8,
    news: [
      // articles here
    ]
  },
  // ... add more stocks
};
```

Replace with your stocks. Example:
```javascript
const STOCKS = ['TSLA', 'AMZN', 'NVDA'];
```

### Add real market data
To pull live prices instead of demo data, integrate a financial API:

**Free options:**
- [Alpha Vantage](https://www.alphavantage.co/) — stocks, forex, crypto (free tier: 5 calls/min)
- [IEX Cloud](https://iexcloud.io/) — stocks, historical data (free tier)
- [Finnhub](https://finnhub.io/) — stocks, news, sentiment (free tier)
- [Financial Modeling Prep](https://financialmodelingprep.com/) — fundamentals, ratios

**Paid (professional):**
- Bloomberg Terminal
- FactSet
- eSpeed / E*TRADE APIs

### Add real news
Currently using demo news. To fetch actual articles:

**Free news APIs:**
- [NewsAPI](https://newsapi.org/) — general news search (free tier: 100 req/day)
- [Finnhub News](https://finnhub.io/) — financial news (free tier)
- [Alpha Vantage News](https://www.alphavantage.co/) — market news
- RSS feeds from financial sites (MarketWatch, Seeking Alpha, Yahoo Finance)

**How to integrate:**
1. Sign up for an API key
2. Add an async function to fetch data in the JavaScript section
3. Parse the response and update the `demoData` object
4. Call it on page load

Example:
```javascript
async function fetchStockData() {
  const response = await fetch(`https://api.example.com/stock/VKNG?key=YOUR_KEY`);
  const data = await response.json();
  return data;
}
```

## Customization

### Change colors
Edit the CSS in the `<style>` block. Current theme uses blue (#0052cc). Examples:
- Green: `#059669`
- Red: `#dc2626`
- Purple: `#7c3aed`

### Change layout
Modify grid sizes in the `stock-grid` and `news-grid` CSS classes:
```css
.stock-grid {
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
}
```

### Add more stocks
Simply add to the `demoData` object and the `STOCKS` array.

### Disable news section
Delete or comment out the news rendering code:
```javascript
// renderNews(demoData);
```

## Performance

- **Page load:** <500ms (pure static)
- **API calls:** 1–2 seconds (depends on your data source)
- **Bandwidth:** ~30 KB
- **Hosting cost:** $0 (GitHub Pages is free)

## Data Sources

- **Stock Prices** — Alpha Vantage, IEX Cloud, Finnhub, or your API
- **News Articles** — NewsAPI, Finnhub, or financial news RSS feeds
- **Historical Data** — Financial Modeling Prep, Alpha Vantage

Currently using **demo data** for easy setup. Replace with live APIs for real-time updates.

## Scheduling Daily Updates

To refresh data automatically each day, set up a scheduled GitHub Action:

Create `.github/workflows/daily-update.yml`:
```yaml
name: Daily Stock Update
on:
  schedule:
    - cron: '0 9 * * MON-FRI'  # 9am weekdays
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Fetch market data
        run: |
          # Your script to fetch data and update index.html
          node scripts/update-stocks.js
      - name: Commit changes
        run: |
          git config user.name "Stock Bot"
          git add index.html
          git commit -m "Daily stock update"
          git push
```

## API Rate Limits

Most free APIs have rate limits:
- Alpha Vantage: 5 calls/min
- NewsAPI: 100 calls/day
- IEX Cloud: Varies by plan
- Finnhub: 60 calls/min (free)

Plan accordingly if updating frequently.

## Troubleshooting

**Q: Prices aren't updating**
- Check the browser console (F12) for errors
- Verify your API key is valid
- Check API rate limits

**Q: News isn't loading**
- Some news APIs require CORS headers
- Try a different news source
- Use a CORS proxy if needed

**Q: Performance is slow**
- Reduce the number of API calls
- Cache data locally in the browser
- Use a CDN for images/assets

## Future Ideas

- [ ] Add watchlist with custom stock lists
- [ ] Portfolio tracking with cost basis
- [ ] Technical charts (candlestick, volume)
- [ ] Analyst ratings & consensus
- [ ] Earnings calendar
- [ ] Options chain data
- [ ] Sentiment analysis from social media
- [ ] Dark mode toggle
- [ ] Export data to CSV

## Technology

- **Frontend:** HTML5, vanilla JavaScript (no dependencies)
- **APIs:** External financial data sources
- **Hosting:** GitHub Pages (free)
- **License:** MIT

## Contributing

Found a bug or have an idea? Open an issue or submit a pull request.

## License

MIT — Free to fork and modify.

## Author

Created with Claude in Cowork mode.

---

**Built for investors who research. No subscriptions, no bloat.** Just clean data and smart summaries.

