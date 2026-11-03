import { describe, it, expect } from 'vitest'
import { normalizeProfile, holdingKey, holdingType } from './normalize.mjs'

describe('normalizeProfile', () => {
  const raw = {
    net_expense_ratio: '0.0018',
    last_updated: '2026-10-30 00:01 UTC',
    sectors: [{ sector: 'Information Technology', weight: '0.5' }],
    holdings: [
      { symbol: 'AAPL', description: 'APPLE INC', weight: '0.6' },
      { symbol: 'n/a', description: 'FERROVIAL SE', weight: '0.3' },
      { symbol: 'n/a', description: 'CASH', weight: '0.1' },
    ],
  }
  it('keys, types and coverage', () => {
    const f = normalizeProfile('X', 'X fund', raw)
    expect(f.as_of).toBe('2026-10-30')
    expect(f.expense_ratio).toBe(0.0018)
    expect(f.holdings.map((h) => h.t)).toEqual(['s', 'o', 'c'])
    expect(f.covered_weight).toBeCloseTo(1, 5)
    expect(f.sectors['INFORMATION TECHNOLOGY']).toBe(0.5)
  })
  it('rejects unusable payloads', () => {
    expect(() => normalizeProfile('X', 'x', { holdings: [] })).toThrow()
    expect(() => normalizeProfile('X', 'x', { Information: 'rate limit' })).toThrow()
  })
  it('keeps bond funds with no itemised holdings', () => {
    const f = normalizeProfile('BND', 'bonds', { net_expense_ratio: '0.0003', holdings: [], sectors: [] })
    expect(f.no_holdings).toBe(true)
    expect(f.covered_weight).toBe(0)
    expect(f.holdings).toHaveLength(1)
    expect(f.holdings[0].t).toBe('o')
  })
  it('helpers', () => {
    expect(holdingKey('n/a', 'Some Bond')).toBe('SOME BOND')
    expect(holdingType('BRK.B', 'BERKSHIRE')).toBe('s')
  })
})
