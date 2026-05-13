# GitHub Pages Deployment Fix

GitHub Pages is static hosting, so visitor browsers cannot directly scrape FOFA, URLHaus, Google Trends, or Trends24 when those sites block CORS.

This version solves that by using GitHub Actions as a scheduled feed collector:

1. `scripts/update_feeds.py` fetches live sources from GitHub Actions.
2. It writes the result to `data/live-feeds.json`.
3. The browser reads `data/live-feeds.json` from the same GitHub Pages origin.

## Deploy

1. Push all files to GitHub.
2. Go to repository Settings → Pages.
3. Select Deploy from branch, usually `main` and `/root`.
4. Go to Actions → `Update OSINT Live Feeds` → Run workflow.
5. Open your GitHub Pages URL.

The workflow refreshes every 30 minutes.
