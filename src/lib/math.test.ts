import { describe, it, expect } from 'vitest'
import {
  toAllocs, lookThrough, overlap, stats, sectorExposure, feeDrag, futureValue,
  weightedExpense, duplicateShare, swapFund, buildAlerts, overlapMatrix, analyze, UNCLASSIFIED,
} from './math'
import type { Fund } from './types'

const mk = (ticker: string, hs: Record<string, number>, er = 0.001, sectors: Record<string, number> = {}): Fund => ({
  ticker, name: ticker, as_of: '2026-10-30', fetched_at: '', expense_ratio: er, net_assets: null,
  total_holdings: Object.keys(hs).length, covered_weight: 1, sectors,
  holdings: Object.entries(hs).map(([s, w]) => ({ s, n: s, w, t: 's' as const })),
})

const A = mk('A', { X: 0.5, Y: 0.5 }, 0.002, { 'INFORMATION TECHNOLOGY': 1 })
const B = mk('B', { X: 1 }, 0.004, { FINANCIALS: 1 })
const funds = { A, B }

describe('look-through math', () => {
  const { allocs } = toAllocs([{ ticker: 'A', amount: 500 }, { ticker: 'B', amount: 500 }], funds)
  const rows = lookThrough(allocs)

  it('E_j = sum_i w_i h_ij', () => {
    expect(rows[0].key).toBe('X')
    expect(rows[0].exposure).toBeCloseTo(0.75)
    expect(rows[1].exposure).toBeCloseTo(0.25)
    expect(rows[0].parts).toHaveLength(2)
  })
  it('overlap = sum of min', () => {
    expect(overlap(A, B)).toBeCloseTo(0.5)
    expect(overlap(A, A)).toBeCloseTo(1)
    expect(overlapMatrix(allocs)[0][1]).toBeCloseTo(0.5)
  })
  it('HHI and N_eff', () => {
    const s = stats(rows)
    expect(s.hhi).toBeCloseTo(0.625)
    expect(s.neff).toBeCloseTo(1.6)
    expect(s.nStocks).toBe(2)
  })
  it('equal-weight N stocks gives N_eff = N', () => {
    const f = mk('E', Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`S${i}`, 1 / 40])))
    const { allocs: a } = toAllocs([{ ticker: 'E', amount: 1 }], { E: f })
    expect(stats(lookThrough(a)).neff).toBeCloseTo(40)
  })
  it('merges duplicates, reports missing tickers', () => {
    const r = toAllocs([{ ticker: 'a', amount: 1 }, { ticker: 'A', amount: 1 }, { ticker: 'ZZZ', amount: 5 }], funds)
    expect(r.allocs).toHaveLength(1)
    expect(r.allocs[0].w).toBe(1)
    expect(r.missing).toEqual(['ZZZ'])
  })
  it('duplicate share', () => {
    // X: 0.75 total, 0.5 from the biggest holder -> 0.25 duplicated; Y none. 0.25 / 1.0
    expect(duplicateShare(rows)).toBeCloseTo(0.25)
  })
})

describe('sectors, alerts, swap', () => {
  const { allocs } = toAllocs([{ ticker: 'A', amount: 500 }, { ticker: 'B', amount: 500 }], funds)
  it('portfolio sectors and benchmark diff', () => {
    const s = sectorExposure(allocs, mk('M', {}, 0, { 'INFORMATION TECHNOLOGY': 0.5, FINANCIALS: 0.5 }))
    const it = s.find((r) => r.sector === 'INFORMATION TECHNOLOGY')!
    expect(it.portfolio).toBeCloseTo(0.5)
    expect(it.diff).toBeCloseTo(0)
  })
  it('missing sector data lands in unclassified', () => {
    const s = sectorExposure([{ fund: mk('Z', { Q: 1 }), w: 1 }], undefined)
    expect(s[0].sector).toBe(UNCLASSIFIED)
  })
  it('fires alerts above thresholds only', () => {
    const an = analyze(allocs, undefined)
    const hi = buildAlerts(allocs, an.rows, an.sectors, { single: 0.5, top10: 1.01, sector: 0.9, overlap: 0.4 }, an.matrix)
    expect(hi.map((a) => a.kind).sort()).toEqual(['overlap', 'single'])
    expect(hi.find((a) => a.id === 'single:X')!.text).toContain('75.0%')
    const lo = buildAlerts(allocs, an.rows, an.sectors, { single: 0.9, top10: 1, sector: 0.9, overlap: 0.9 }, an.matrix)
    expect(lo).toHaveLength(0)
  })
  it('swap keeps weight', () => {
    const out = swapFund(allocs, 'B', mk('C', { Z: 1 }))
    expect(out.reduce((a, x) => a + x.w, 0)).toBeCloseTo(1)
    expect(out.map((x) => x.fund.ticker).sort()).toEqual(['A', 'C'])
  })
})

describe('fees', () => {
  it('future value formula', () => {
    expect(futureValue(1000, 0, 0.07, 10)).toBeCloseTo(1967.15, 1)
    expect(futureValue(0, 100, 0.05, 2)).toBeCloseTo(205)
    expect(futureValue(0, 100, 0, 3)).toBe(300)
  })
  it('dollar gap between gross and net', () => {
    const d = feeDrag(10000, 0, 0.07, 0.01, 30)
    expect(d.vGross).toBeCloseTo(10000 * 1.07 ** 30, 4)
    expect(d.gap).toBeCloseTo(10000 * (1.07 ** 30 - 1.06 ** 30), 4)
  })
  it('weighted expense ratio', () => {
    const { allocs } = toAllocs([{ ticker: 'A', amount: 500 }, { ticker: 'B', amount: 500 }], funds)
    expect(weightedExpense(allocs)).toBeCloseTo(0.003)
  })
})
