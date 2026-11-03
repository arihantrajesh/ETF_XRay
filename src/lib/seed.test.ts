import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { toAllocs, analyze } from './math'
import { SAMPLES } from './samples'
import type { Fund } from './types'

const dir = path.resolve(__dirname, '../../public/data/etfs')
const funds: Record<string, Fund> = {}
for (const f of fs.readdirSync(dir)) funds[f.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))

describe('seed data sanity', () => {
  for (const s of SAMPLES) {
    it(`${s.label} computes`, () => {
      const { allocs, missing } = toAllocs(s.positions, funds)
      expect(missing).toEqual([])
      const an = analyze(allocs, funds['VTI'])
      expect(an.score.score).toBeGreaterThanOrEqual(0)
    })
  }
  it('VTI alone', () => {
    const an = analyze(toAllocs([{ ticker: 'VTI', amount: 1 }], funds).allocs, funds['VTI'])
    expect(an.score.score).toBeGreaterThan(70)
  })
})
