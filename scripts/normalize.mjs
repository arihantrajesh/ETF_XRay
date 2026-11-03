// Converts a raw Alpha Vantage ETF_PROFILE payload into the compact fund JSON the app reads.
export const MAX_HOLDINGS = 1000

const SYMBOL_RE = /^[A-Z][A-Z0-9.\-]{0,6}$/
const CASH_RE = /\b(CASH|FUTURE|FUTURES|SWAP|FORWARD|FX|MONEY MARKET|COLLATERAL)\b/i

export function holdingKey(symbol, description) {
  const s = String(symbol ?? '').trim().toUpperCase()
  if (SYMBOL_RE.test(s) && s !== 'N/A') return s
  return String(description ?? 'UNKNOWN').trim().toUpperCase()
}

// t: 's' = listed stock, 'o' = other (bonds, unlisted), 'c' = cash / derivatives
export function holdingType(symbol, description) {
  if (CASH_RE.test(String(description ?? ''))) return 'c'
  const s = String(symbol ?? '').trim().toUpperCase()
  return SYMBOL_RE.test(s) && s !== 'N/A' ? 's' : 'o'
}

export function normalizeProfile(ticker, name, raw, fetchedAt = new Date()) {
  if (!raw || !Array.isArray(raw.holdings) || raw.net_expense_ratio === undefined) {
    throw new Error(`Unusable payload for ${ticker}`)
  }
  // Bond funds often come back with an empty holdings list. Keep the fund (fees, sector=none) with a
  // single placeholder position so it still counts as a non-stock slice of the portfolio.
  const noHoldings = raw.holdings.length === 0
  const merged = new Map()
  if (noHoldings) {
    merged.set(`${ticker} BONDS`, { s: `${ticker} BONDS`, n: `${ticker} underlying bonds (not itemised by data source)`, w: 1, t: 'o' })
  }
  for (const h of raw.holdings) {
    const w = Number(h.weight)
    if (!Number.isFinite(w) || w <= 0) continue
    const k = holdingKey(h.symbol, h.description)
    const prev = merged.get(k)
    if (prev) prev.w += w
    else {
      const desc = h.description && h.description !== 'n/a' ? String(h.description) : k
      merged.set(k, { s: k, n: desc, w, t: holdingType(h.symbol, h.description) })
    }
  }
  const all = [...merged.values()].sort((a, b) => b.w - a.w)
  const kept = all.slice(0, MAX_HOLDINGS).map((h) => ({ ...h, w: Math.round(h.w * 1e6) / 1e6 }))
  const sectors = {}
  for (const s of raw.sectors ?? []) {
    const w = Number(s.weight)
    if (Number.isFinite(w) && w > 0) sectors[String(s.sector).toUpperCase()] = w
  }
  const lastUpdated = String(raw.last_updated ?? '').slice(0, 10)
  return {
    ticker,
    name,
    as_of: /^\d{4}-\d{2}-\d{2}$/.test(lastUpdated) ? lastUpdated : fetchedAt.toISOString().slice(0, 10),
    fetched_at: fetchedAt.toISOString(),
    expense_ratio: Number(raw.net_expense_ratio) || 0,
    net_assets: Number(raw.net_assets) || null,
    total_holdings: noHoldings ? 0 : Number(raw.holdings_total_count) || all.length,
    covered_weight: noHoldings ? 0 : Math.round(kept.reduce((a, h) => a + h.w, 0) * 1e5) / 1e5,
    no_holdings: noHoldings || undefined,
    sectors,
    holdings: kept,
  }
}
