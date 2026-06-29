# Automatic Stock Data Updates

This setup automatically updates VKTX & IOVA stock prices and news every weekday at 4:15 PM ET (market close).

## What Happens

- **Every weekday at 4:15 PM ET**, GitHub Actions runs a script that:
  1. Fetches live stock prices from Finnhub
  2. Fetches latest news from NewsAPI
  3. Updates `index.html`, `vktx.html`, and `iova.html`
  4. Automatically commits and pushes the changes
  5. Your live site refreshes with new data within minutes

## Setup (5 minutes)

### Step 1: Get API Keys

**Finnhub (Stock Prices):**
1. Go to https://finnhub.io/register
2. Sign up (free account)
3. Copy your API key from the dashboard
4. Save it somewhere safe

**NewsAPI (News Articles):**
1. Go to https://newsapi.org/register
2. Sign up (free account)
3. Copy your API key
4. Save it

### Step 2: Add Secrets to GitHub

1. Go to your repo on GitHub
2. Settings → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:
   - **Name:** `FINNHUB_API_KEY` → **Value:** (paste your Finnhub key)
   - **Name:** `NEWSAPI_KEY` → **Value:** (paste your NewsAPI key)
5. Click **Add secret**

### Step 3: Add Files to Your Repo

Copy these files to your repo root:
- `update-stocks.js` — the update script
- `.github/workflows/update-stocks.yml` — the GitHub Action workflow

Your repo structure should look like:
```
biotech-stock-digest/
├── .github/
│   └── workflows/
│       └── update-stocks.yml
├── update-stocks.js
├── index.html
├── vktx.html
├── iova.html
├── README.md
└── .gitignore
```

### Step 4: Enable GitHub Actions

1. Go to your repo → **Actions** tab
2. If you see "Workflows aren't being run", click **I understand, let me enable them**

### Step 5: Test It

1. Go to **Actions** tab
2. Click **Update Stock Data Daily** on the left
3. Click **Run workflow** → **Run workflow**
4. Watch the job run in real-time
5. After ~30 seconds, your HTML files should update with live prices

## How It Works

**Schedule:**
- Runs **Monday-Friday at 4:15 PM ET** (market close)
- Skips weekends and holidays automatically

**Data Sources:**
- **Stock Prices:** Finnhub API (real-time or 15-min delayed depending on free tier)
- **News:** NewsAPI (1000+ financial news sources)

**What Gets Updated:**
- `index.html` — prices and news on dashboard
- `vktx.html` — Vikings profile page
- `iova.html` — Iovance profile page

## Customization

### Change Update Time

Edit `.github/workflows/update-stocks.yml`:
```yaml
- cron: '15 20 * * MON-FRI'  # Current: 4:15 PM ET (8:15 PM UTC)
```

Cron format: `minute hour day month day-of-week`

Examples:
- `0 9 * * MON-FRI` — 9:00 AM ET weekdays
- `30 13 * * MON-FRI` — 1:30 PM ET weekdays
- `0 0 * * *` — Midnight daily

[Cron cheatsheet](https://crontab.guru/)

### Add More Stocks

Edit `update-stocks.js`:
```javascript
const STOCKS = ['VKTX', 'IOVA', 'CRSP'];  // Add CRSP
```

Then create a profile page for the new stock (copy vkng.html, update the data).

### Disable Automation

Delete `.github/workflows/update-stocks.yml` from your repo.

## Troubleshooting

**"No API key provided" error:**
- Check that secrets are added correctly (Settings → Secrets)
- Restart the workflow

**Prices not updating:**
- Run workflow manually to test
- Check GitHub Actions logs for errors (Actions tab)
- Verify API keys are correct

**"Failed to commit" error:**
- GitHub Actions token may have expired
- Try re-running the workflow

**Workflow doesn't run on schedule:**
- Make sure Actions are enabled (Settings → Actions → General)
- Check cron syntax on [crontab.guru](https://crontab.guru/)

## API Limits

**Finnhub (Free):**
- 60 API calls/minute
- Real-time quotes

**NewsAPI (Free):**
- 100 requests/day
- 1-month history

Both are more than enough for daily updates. No credit card needed.

## Advanced: Monitor Updates

To see when updates happen:
1. Go to **Actions** tab
2. Click **Update Stock Data Daily**
3. See all past runs and their timestamps

You can also check the git commit history to see when prices last changed.

## Questions?

If something breaks:
1. Check GitHub Actions logs (Actions tab → run → scroll down)
2. Verify API keys are set correctly
3. Try running the workflow manually
4. Check that all files are in the repo

---

**Done!** Your site now updates automatically every market day. 📈
