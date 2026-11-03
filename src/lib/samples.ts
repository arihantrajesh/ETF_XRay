import type { Position } from './types'

export interface Sample {
  id: string
  label: string
  blurb: string
  positions: Position[]
}

export const SAMPLES: Sample[] = [
  {
    id: 'tech',
    label: 'Tech-heavy 4-ETF investor',
    blurb: 'Four popular funds that all lean on the same mega-cap tech names.',
    positions: [
      { ticker: 'VOO', amount: 30000 },
      { ticker: 'QQQ', amount: 25000 },
      { ticker: 'VUG', amount: 20000 },
      { ticker: 'SCHG', amount: 15000 },
    ],
  },
  {
    id: 'three',
    label: 'Classic 3-fund',
    blurb: 'U.S. stocks, international stocks and bonds: the textbook mix.',
    positions: [
      { ticker: 'VTI', amount: 50000 },
      { ticker: 'VXUS', amount: 30000 },
      { ticker: 'BND', amount: 20000 },
    ],
  },
  {
    id: 'target',
    label: 'Target-date plus extras',
    blurb: 'A target-date fund (approximated by its VTI / VXUS / BND building blocks) plus thematic add-ons.',
    positions: [
      { ticker: 'VTI', amount: 40000 },
      { ticker: 'VXUS', amount: 20000 },
      { ticker: 'BND', amount: 10000 },
      { ticker: 'QQQ', amount: 10000 },
      { ticker: 'SMH', amount: 5000 },
      { ticker: 'ARKK', amount: 5000 },
    ],
  },
]
