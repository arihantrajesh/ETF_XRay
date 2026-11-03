import type { Alloc, Fund, Position, Thresholds } from './types'

export const UNCLASSIFIED = 'NOT CLASSIFIED (BONDS / OTHER)'

const SECTOR_ALIASES: Record<string, string> = {
  TECHNOLOGY: 'INFORMATION TECHNOLOGY',
  'HEALTH CARE': 'HEALTHCARE',
  'FINANCIAL SERVICES': 'FINANCIALS',
  FINANCIAL: 'FINANCIALS',
  'CONSUMER CYCLICAL': 'CONSUMER DISCRETIONARY',
  'CONSUMER DEFENSIVE': 'CONSUMER STAPLES',
  'BASIC MATERIALS': 'MATERIALS',
  'COMMUNICATION SERVICES': 'COMMUNICATION SERVICES',
  TELECOMMUNICATIONS: 'COMMUNICATION SERVICES',
}
export const normSector = (s: string) => SECTOR_ALIASES[s.toUpperCase()] ?? s.toUpperCase()

/** Turn dollar positions into portfolio weights w_i (summing to 1). Duplicate tickers are merged. */
export function toAllocs(positions: Position[], funds: Record<string, Fund>) {
  const byTicker = new Map<string, number>()
  const missing: string[] = []
  for (const p of positions) {
    const t = p.ticker.trim().toUpperCase()
    if (!t || !(p.amount > 0)) continue
    if (!funds[t]) {
      if (!missing.includes(t)) missing.push(t)
      continue
    }
    byTicker.set(t, (byTicker.get(t) ?? 0) + p.amount)
  }
  const total = [...byTicker.values()].reduce((a, b) => a + b, 0)
  const allocs: Alloc[] = [...byTicker.entries()]
    .map(([t, amt]) => ({ fund: funds[t], w: amt / total }))
    .sort((a, b) => b.w - a.w)
  return { allocs, missing, total }
}

export interface Row {
  key: string
  name: string
  type: 's' | 'o' | 'c'
  exposure: number
  parts: { ticker: string; h: number; contrib: number }[]
}

/** True exposure E_j = sum_i w_i * h_ij, with the per-fund breakdown. */
export function lookThrough(allocs: Alloc[]): Row[] {
  const map = new Map<string, Row>()
  for (const { fund, w } of allocs) {
    for (const h of fund.holdings) {
      let r = map.get(h.s)
      if (!r) {
        r = { key: h.s, name: h.n, type: h.t, exposure: 0, parts: [] }
        map.set(h.s, r)
      }
      const contrib = w * h.w
      r.exposure += contrib
      r.parts.push({ ticker: fund.ticker, h: h.w, contrib })
    }
  }
  return [...map.values()].sort((a, b) => b.exposure - a.exposure)
}

/** Overlap(A,B) = sum_j min(h_Aj, h_Bj). */
export function overlap(a: Fund, b: Fund): number {
  const m = new Map(a.holdings.map((h) => [h.s, h.w]))
  let sum = 0
  for (const h of b.holdings) {
    const x = m.get(h.s)
    if (x !== undefined) sum += Math.min(x, h.w)
  }
  return sum
}

export function overlapMatrix(allocs: Alloc[]): number[][] {
  const n = allocs.length
  const out = Array.from({ length: n }, () => new Array<number>(n).fill(1))
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) out[i][j] = out[j][i] = overlap(allocs[i].fund, allocs[j].fund)
  return out
}

/** Weighted average pairwise overlap (weights w_a * w_b over distinct pairs). 0 for a single fund. */
export function avgPairOverlap(allocs: Alloc[]): number {
  let num = 0
  let den = 0
  for (let i = 0; i < allocs.length; i++)
    for (let j = i + 1; j < allocs.length; j++) {
      const wt = allocs[i].w * allocs[j].w
      num += wt * overlap(allocs[i].fund, allocs[j].fund)
      den += wt
    }
  return den > 0 ? num / den : 0
}

export interface Stats {
  nStocks: number
  equityShare: number
  hhi: number
  neff: number
  top10: number
  maxStock: Row | null
}

/**
 * HHI / N_eff are computed over listed stocks only, with exposures re-normalised to sum to 1
 * (so bonds, cash and uncovered tails do not distort the stock-concentration measure).
 * Top-10 and single-stock figures stay as shares of the whole portfolio.
 */
export function stats(rows: Row[]): Stats {
  const stocks = rows.filter((r) => r.type === 's')
  const equityShare = stocks.reduce((a, r) => a + r.exposure, 0)
  const hhi = equityShare > 0 ? stocks.reduce((a, r) => a + (r.exposure / equityShare) ** 2, 0) : 0
  return {
    nStocks: stocks.length,
    equityShare,
    hhi,
    neff: hhi > 0 ? 1 / hhi : 0,
    top10: stocks.slice(0, 10).reduce((a, r) => a + r.exposure, 0),
    maxStock: stocks[0] ?? null,
  }
}

export interface SectorRow {
  sector: string
  portfolio: number
  benchmark: number
  diff: number
}

export function sectorExposure(allocs: Alloc[], benchmark: Fund | undefined): SectorRow[] {
  const port = new Map<string, number>()
  const bench = new Map<string, number>()
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v)
  for (const { fund, w } of allocs) {
    let covered = 0
    for (const [s, x] of Object.entries(fund.sectors)) {
      add(port, normSector(s), w * x)
      covered += x
    }
    if (covered < 0.995) add(port, UNCLASSIFIED, w * (1 - covered))
  }
  if (benchmark) {
    let covered = 0
    for (const [s, x] of Object.entries(benchmark.sectors)) {
      add(bench, normSector(s), x)
      covered += x
    }
    if (covered < 0.995) add(bench, UNCLASSIFIED, 1 - covered)
  }
  const keys = new Set([...port.keys(), ...bench.keys()])
  return [...keys]
    .map((sector) => {
      const p = port.get(sector) ?? 0
      const b = bench.get(sector) ?? 0
      return { sector, portfolio: p, benchmark: b, diff: p - b }
    })
    .sort((a, b) => b.portfolio - a.portfolio)
}

export interface ScoreResult {
  score: number
  verdict: string
  tone: 'good' | 'ok' | 'warn' | 'bad'
  parts: { label: string; points: number; max: number; detail: string }[]
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** 0-100 grade built from five transparent components (see Methodology). */
export function diversificationScore(allocs: Alloc[], rows: Row[], sectors: SectorRow[]): ScoreResult {
  const s = stats(rows)
  const maxE = s.maxStock?.exposure ?? 0
  const sectorTilt =
    sectors.filter((r) => r.sector !== UNCLASSIFIED).reduce((a, r) => a + Math.abs(r.diff), 0) / 2
  const redundancy = avgPairOverlap(allocs)

  const breadth = s.neff > 1 ? clamp01(Math.log(s.neff) / Math.log(60)) : 0
  const single = 1 - clamp01((maxE - 0.03) / 0.07)
  const top = 1 - clamp01((s.top10 - 0.25) / 0.3)
  const tilt = 1 - clamp01(sectorTilt / 0.35)
  const red = 1 - clamp01(redundancy / 0.6)

  const parts = [
    { label: 'Effective breadth', points: 35 * breadth, max: 35, detail: `N_eff = ${s.neff.toFixed(1)}` },
    { label: 'Largest single stock', points: 20 * single, max: 20, detail: `${(maxE * 100).toFixed(1)}% of portfolio` },
    { label: 'Top-10 concentration', points: 15 * top, max: 15, detail: `${(s.top10 * 100).toFixed(1)}% of portfolio` },
    { label: 'Sector tilt vs. market', points: 20 * tilt, max: 20, detail: `${(sectorTilt * 100).toFixed(1)} pts away from VTI` },
    { label: 'Fund redundancy', points: 10 * red, max: 10, detail: `${(redundancy * 100).toFixed(0)}% average pair overlap` },
  ]
  const score = Math.round(parts.reduce((a, p) => a + p.points, 0))
  const [verdict, tone] =
    score >= 80
      ? ['Well diversified: your mix looks a lot like the broad market.', 'good' as const]
      : score >= 60
        ? ['Moderately diversified, with some concentration worth knowing about.', 'ok' as const]
        : score >= 40
          ? ['Concentrated: a handful of stocks drive most of your results.', 'warn' as const]
          : ['Highly concentrated: your funds are far less diversified than they look.', 'bad' as const]
  return { score, verdict, tone, parts }
}

export interface Alert {
  id: string
  kind: 'single' | 'top10' | 'sector' | 'overlap'
  level: 'warn' | 'high'
  text: string
}

export function buildAlerts(
  allocs: Alloc[],
  rows: Row[],
  sectors: SectorRow[],
  th: Thresholds,
  matrix: number[][],
): Alert[] {
  const out: Alert[] = []
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  const lvl = (v: number, t: number): 'warn' | 'high' => (v > t * 1.5 ? 'high' : 'warn')
  for (const r of rows) {
    if (r.type !== 's' || r.exposure <= th.single) continue
    const n = r.parts.length
    out.push({
      id: `single:${r.key}`, kind: 'single', level: lvl(r.exposure, th.single),
      text: `${r.key} is ${pct(r.exposure)} of your portfolio across ${n} fund${n === 1 ? '' : 's'}.`,
    })
  }
  const st = stats(rows)
  if (st.top10 > th.top10)
    out.push({
      id: 'top10', kind: 'top10', level: lvl(st.top10, th.top10),
      text: `Your 10 largest stocks make up ${pct(st.top10)} of your portfolio.`,
    })
  for (const s of sectors) {
    if (s.sector === UNCLASSIFIED || s.portfolio <= th.sector) continue
    out.push({
      id: `sector:${s.sector}`, kind: 'sector', level: lvl(s.portfolio, th.sector),
      text: `${title(s.sector)} is ${pct(s.portfolio)} of your portfolio (${pct(s.benchmark)} in the total market).`,
    })
  }
  for (let i = 0; i < allocs.length; i++)
    for (let j = i + 1; j < allocs.length; j++) {
      const v = matrix[i][j]
      if (v <= th.overlap) continue
      out.push({
        id: `overlap:${allocs[i].fund.ticker}:${allocs[j].fund.ticker}`, kind: 'overlap', level: lvl(v, th.overlap),
        text: `${allocs[i].fund.ticker} and ${allocs[j].fund.ticker} overlap by ${pct(v)}: you pay two fees for much of the same stocks.`,
      })
    }
  return out
}

export const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

/** Replace the fund `from` with `to`, keeping the dollar weight. */
export function swapFund(allocs: Alloc[], from: string, to: Fund): Alloc[] {
  const moved = allocs.find((a) => a.fund.ticker === from)
  if (!moved) return allocs
  const rest = allocs.filter((a) => a.fund.ticker !== from && a.fund.ticker !== to.ticker)
  const existing = allocs.find((a) => a.fund.ticker === to.ticker)
  return [...rest, { fund: to, w: moved.w + (existing?.w ?? 0) }].sort((a, b) => b.w - a.w)
}

export interface Analysis {
  rows: Row[]
  matrix: number[][]
  st: Stats
  sectors: SectorRow[]
  score: ScoreResult
}

export function analyze(allocs: Alloc[], benchmark: Fund | undefined): Analysis {
  const rows = lookThrough(allocs)
  const matrix = overlapMatrix(allocs)
  const sectors = sectorExposure(allocs, benchmark)
  return { rows, matrix, st: stats(rows), sectors, score: diversificationScore(allocs, rows, sectors) }
}

// ---- fees ----

export const weightedExpense = (allocs: Alloc[]) => allocs.reduce((a, x) => a + x.w * x.fund.expense_ratio, 0)

/** Future value of an initial balance plus level end-of-year contributions. */
export function futureValue(initial: number, annual: number, rate: number, years: number): number {
  const g = (1 + rate) ** years
  return initial * g + (rate === 0 ? annual * years : (annual * (g - 1)) / rate)
}

export function feeDrag(initial: number, annual: number, gross: number, expense: number, years: number) {
  const vGross = futureValue(initial, annual, gross, years)
  const vNet = futureValue(initial, annual, gross - expense, years)
  return { vGross, vNet, gap: vGross - vNet }
}

/**
 * Share of equity exposure held through more than one fund beyond the largest holder:
 * D = sum_j (E_j - max_i w_i h_ij) / sum_j E_j. Fees paid on that slice buy exposure you already own.
 */
export function duplicateShare(rows: Row[]): number {
  let dup = 0
  let tot = 0
  for (const r of rows) {
    tot += r.exposure
    dup += r.exposure - Math.max(...r.parts.map((p) => p.contrib))
  }
  return tot > 0 ? dup / tot : 0
}
