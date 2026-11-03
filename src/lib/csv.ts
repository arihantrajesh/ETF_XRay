import type { Fund, Holding, Position } from './types'

function parseRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, '')))
}

const num = (s: string) => Number(s.replace(/[$,%\s]/g, ''))

/** Portfolio CSV: ticker, amount (header optional). */
export function parsePortfolioCsv(text: string): Position[] {
  return parseRows(text)
    .filter((r) => r.length >= 2 && Number.isFinite(num(r[1])) && num(r[1]) > 0)
    .map((r) => ({ ticker: r[0].toUpperCase(), amount: num(r[1]) }))
}

/** Holdings CSV for an ETF we don't have: ticker, weight. Weights in % or as fractions. */
export function parseHoldingsCsv(text: string, ticker: string, expense: number, sectors: Record<string, number> = {}): Fund {
  const rows = parseRows(text).filter((r) => r.length >= 2 && Number.isFinite(num(r[1])) && num(r[1]) > 0)
  const raw = rows.map((r) => ({ s: r[0].toUpperCase(), w: num(r[1]) }))
  const sum = raw.reduce((a, r) => a + r.w, 0)
  const scale = sum > 1.5 ? 100 : 1 // percent vs fraction
  const merged = new Map<string, number>()
  for (const r of raw) merged.set(r.s, (merged.get(r.s) ?? 0) + r.w / scale)
  const holdings: Holding[] = [...merged.entries()]
    .map(([s, w]) => ({ s, n: s, w, t: 's' as const }))
    .sort((a, b) => b.w - a.w)
  return {
    ticker: ticker.toUpperCase(),
    name: `${ticker.toUpperCase()} (uploaded CSV)`,
    as_of: new Date().toISOString().slice(0, 10),
    fetched_at: new Date().toISOString(),
    expense_ratio: expense,
    net_assets: null,
    total_holdings: holdings.length,
    covered_weight: Math.min(1, holdings.reduce((a, h) => a + h.w, 0)),
    sectors,
    holdings,
    custom: true,
  }
}
