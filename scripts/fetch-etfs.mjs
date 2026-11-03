#!/usr/bin/env node
// Pulls ETF_PROFILE from Alpha Vantage for the curated list and writes static JSON to public/data.
//   AV_API_KEY=xxx node scripts/fetch-etfs.mjs            refresh the stalest funds (up to MAX_REQUESTS)
//   node scripts/fetch-etfs.mjs --ingest VTI raw.json      normalize an already-downloaded raw payload
// The free tier allows ~25 requests/day, so each run refreshes the oldest files first and keeps the
// previous JSON for any fund whose fetch fails or is rate-limited.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeProfile } from './normalize.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, 'public', 'data')
const etfDir = path.join(dataDir, 'etfs')
const list = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'etf-list.json'), 'utf8'))
fs.mkdirSync(etfDir, { recursive: true })

const fundPath = (t) => path.join(etfDir, `${t}.json`)
const readFund = (t) => (fs.existsSync(fundPath(t)) ? JSON.parse(fs.readFileSync(fundPath(t), 'utf8')) : null)

function writeIndex() {
  const funds = list
    .map((e) => readFund(e.ticker))
    .filter(Boolean)
    .map((f) => ({
      ticker: f.ticker, name: f.name, as_of: f.as_of, fetched_at: f.fetched_at,
      expense_ratio: f.expense_ratio, net_assets: f.net_assets,
      total_holdings: f.total_holdings, covered_weight: f.covered_weight,
      kept_holdings: f.holdings.length,
    }))
  const index = { generated_at: new Date().toISOString(), source: 'Alpha Vantage ETF_PROFILE', funds }
  fs.writeFileSync(path.join(dataDir, 'index.json'), JSON.stringify(index, null, 1))
  console.log(`index.json: ${funds.length}/${list.length} funds`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const args = process.argv.slice(2)

if (args[0] === '--ingest') {
  const [, ticker, file] = args
  const meta = list.find((e) => e.ticker === ticker)
  if (!meta) throw new Error(`${ticker} not in etf-list.json`)
  const fund = normalizeProfile(ticker, meta.name, JSON.parse(fs.readFileSync(file, 'utf8')))
  fs.writeFileSync(fundPath(ticker), JSON.stringify(fund))
  writeIndex()
  console.log(`ingested ${ticker}: ${fund.holdings.length}/${fund.total_holdings} holdings, as_of ${fund.as_of}`)
  process.exit(0)
}

const key = process.env.AV_API_KEY
if (!key) {
  console.error('AV_API_KEY is not set. Get a free key at https://www.alphavantage.co/support/#api-key')
  process.exit(1)
}
const max = Number(process.env.MAX_REQUESTS ?? 25)
const queue = [...list]
  .sort((a, b) => (readFund(a.ticker)?.fetched_at ?? '').localeCompare(readFund(b.ticker)?.fetched_at ?? ''))
  .slice(0, max)

let ok = 0
let failed = 0
for (const etf of queue) {
  try {
    const url = `https://www.alphavantage.co/query?function=ETF_PROFILE&symbol=${etf.ticker}&apikey=${key}`
    const res = await fetch(url)
    const raw = await res.json()
    const msg = raw.Information ?? raw.Note ?? raw['Error Message']
    if (msg) {
      console.warn(`${etf.ticker}: ${msg}`)
      if (/rate limit|requests per day|premium/i.test(msg)) {
        console.warn('Rate limited: stopping. Remaining funds keep their previous data.')
        break
      }
      failed++
      continue
    }
    const fund = normalizeProfile(etf.ticker, etf.name, raw)
    fs.writeFileSync(fundPath(etf.ticker), JSON.stringify(fund))
    ok++
    console.log(`${etf.ticker}: ${fund.holdings.length}/${fund.total_holdings} holdings, as_of ${fund.as_of}`)
  } catch (e) {
    failed++
    console.warn(`${etf.ticker}: failed (${e.message}); keeping previous file`)
  }
  await sleep(1200)
}
console.log(`done: ${ok} updated, ${failed} failed`)
writeIndex()
