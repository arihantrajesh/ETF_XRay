# ETF X-Ray

**See what your ETFs really own.** A free, login-free web app that looks through a portfolio of ETFs to the underlying stocks, shows where the funds overlap, scores diversification 0–100, and raises alerts when concentration crosses limits you set.

Built for Duke FMKT 256 extra credit (Prompt 1: finance app, a Visualization Tool + Screener hybrid).

> **Educational only. Not investment advice.** Figures are estimates from public fund data and may be delayed or incomplete.

## Features

| Tab | What it does |
| --- | --- |
| Overview | Headline ("You own X stocks on paper, but behave like N"), 0–100 score with breakdown, live alerts, top-10 true holdings stacked by fund |
| Look-through | Every underlying stock with combined true weight and per-fund contribution; sortable, searchable |
| Overlap | Pairwise overlap heatmap + most redundant pairs |
| Sectors | Your true sector weights vs. the total market (VTI) |
| Alerts | Configurable thresholds (single stock, top-10, sector, pair overlap); alerts re-evaluate live and pop up as toasts |
| Fee drag | 10/20/30-year dollar cost of the weighted expense ratio, plus the cost of paying for overlapping funds |
| What if | Swap one fund for another and see the score change; ranks every replacement |
| Data | "Data as of" and coverage per ETF, **Refresh data** button, CSV upload for ETFs we don't have |
| Methodology | The math, with the disclaimer |

Three one-click sample portfolios are preloaded. Inputs: tickers + dollar amounts / % weights, or a CSV (`ticker,amount`).

## Methodology (summary)

With portfolio weights `w_i` and holding weights `h_ij`:

- True exposure: `E_j = Σ_i w_i · h_ij`
- Overlap: `Overlap(A,B) = Σ_j min(h_Aj, h_Bj)`
- `HHI = Σ_j E_j²`, `N_eff = 1 / HHI` (over listed stocks, exposures re-normalised)
- Fee drag: `V_T(g) − V_T(g − r)` where `V_T(x) = P(1+x)^T + C·((1+x)^T − 1)/x` and `r` is the weighted expense ratio
- Score: 35 pts effective breadth, 20 largest stock, 15 top-10 share, 20 sector tilt vs. VTI, 10 fund redundancy

Full details (with rendered equations) are on the app's Methodology tab and in `src/lib/math.ts`, which is unit-tested (`npm test`).

## Data architecture: importing history and updating when new data arrives

```
Alpha Vantage ETF_PROFILE ──► scripts/fetch-etfs.mjs ──► public/data/etfs/*.json + index.json ──► static site
        (daily GitHub Action)        (stalest-first, keeps old file on failure)         (client-side math)
```

- The **browser never calls the API** and no key ships to the client. All math runs client-side from static JSON, so there is no backend and no login.
- `scripts/fetch-etfs.mjs` pulls holdings, sector weights and expense ratio for the ETFs in `scripts/etf-list.json`, normalises them, and writes one JSON file per ETF stamped with `as_of` (vendor's last-updated date) and `fetched_at`, plus a manifest `index.json`.
- The free Alpha Vantage tier allows ~25 requests/day. Each run refreshes the **stalest** funds first (up to `MAX_REQUESTS`, default 25), stops cleanly on a rate-limit, and **keeps the previous file** for any fund that fails.
- Each fund keeps at most its 1,000 largest holdings; the Data tab shows `Top N of M holdings, Y% of fund` per ETF. Where coverage is partial, results are lower bounds.
- Committed seed JSON means the site works immediately, even when the API is rate-limited.
- **To add an ETF:** add `{ticker, name}` to `scripts/etf-list.json` and run the refresh. No other code changes.
- **Users** can also upload a `ticker,weight` CSV for an ETF not in the list; it is merged client-side.

### Scheduled refresh (GitHub Actions)

`.github/workflows/refresh-data.yml` runs daily (11:17 UTC) and on manual trigger:

1. Runs the fetch script with the repository secret `AV_API_KEY`.
2. Commits any changed JSON under `public/data`.
3. Triggers `deploy.yml` to rebuild and redeploy the site.

Setup: repo → Settings → Secrets and variables → Actions → New repository secret → `AV_API_KEY`.
Manual run: Actions tab → "Refresh ETF data" → Run workflow (or `gh workflow run refresh-data.yml`).

### Local run

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # math + data normalisation tests
AV_API_KEY=xxxx npm run fetch-data     # refresh data locally (never commit the key)
npm run build          # static site in dist/
```

## Deployment

GitHub Pages via Actions (`.github/workflows/deploy.yml`) on every push to `main`. In Settings → Pages, set **Source: GitHub Actions**.

## Known data limitations

- Alpha Vantage returns **no itemised holdings for bond funds** (e.g. BND, AGG); they are modelled as a single non-stock slice and flagged on the Data tab.
- International funds (e.g. VXUS) only list holdings that have US-style tickers, so coverage is partial and flagged.
- Sector weights are fund-level, as classified by the vendor.
