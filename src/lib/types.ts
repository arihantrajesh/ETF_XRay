export type HoldingType = 's' | 'o' | 'c'

export interface Holding {
  s: string
  n: string
  w: number
  t: HoldingType
}

export interface Fund {
  ticker: string
  name: string
  as_of: string
  fetched_at: string
  expense_ratio: number
  net_assets: number | null
  total_holdings: number
  covered_weight: number
  sectors: Record<string, number>
  holdings: Holding[]
  custom?: boolean
  no_holdings?: boolean
}

export interface IndexEntry {
  ticker: string
  name: string
  as_of: string
  fetched_at: string
  expense_ratio: number
  net_assets: number | null
  total_holdings: number
  covered_weight: number
  kept_holdings: number
}

export interface DataIndex {
  generated_at: string
  source: string
  funds: IndexEntry[]
}

export interface Position {
  ticker: string
  amount: number
}

export interface Alloc {
  fund: Fund
  w: number
}

export interface Thresholds {
  single: number
  top10: number
  sector: number
  overlap: number
}
