import { useRef, useState } from 'react'
import type { Fund, Position } from '../lib/types'
import { SAMPLES } from '../lib/samples'
import { parsePortfolioCsv } from '../lib/csv'
import { usd } from '../lib/format'

interface Props {
  positions: Position[]
  setPositions: (p: Position[]) => void
  funds: Record<string, Fund>
  missing: string[]
  sampleId: string | null
  setSampleId: (id: string | null) => void
}

export default function PortfolioPanel({ positions, setPositions, funds, missing, sampleId, setSampleId }: Props) {
  const [mode, setMode] = useState<'usd' | 'pct'>('usd')
  const fileRef = useRef<HTMLInputElement>(null)
  const total = positions.reduce((a, p) => a + (p.amount > 0 ? p.amount : 0), 0)
  const edit = (i: number, patch: Partial<Position>) => {
    setSampleId(null)
    setPositions(positions.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  }

  return (
    <section className="card panel" aria-label="Your portfolio">
      <h2>Your portfolio</h2>
      <div className="samples">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            className={`chip ${sampleId === s.id ? 'on' : ''}`}
            title={s.blurb}
            onClick={() => {
              setSampleId(s.id)
              setPositions(s.positions)
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {sampleId && <p className="muted small">{SAMPLES.find((s) => s.id === sampleId)?.blurb}</p>}

      <div className="seg" role="group" aria-label="Input mode">
        <button className={mode === 'usd' ? 'on' : ''} onClick={() => setMode('usd')}>Dollars</button>
        <button className={mode === 'pct' ? 'on' : ''} onClick={() => setMode('pct')}>% weights</button>
      </div>

      <div className="poslist">
        {positions.map((p, i) => {
          const bad = p.ticker && !funds[p.ticker.toUpperCase()]
          const share = total > 0 && p.amount > 0 ? p.amount / total : 0
          return (
            <div className="posrow" key={i}>
              <input
                aria-label="Ticker"
                className={`tick ${bad ? 'bad' : ''}`}
                value={p.ticker}
                list="tickers"
                placeholder="VOO"
                onChange={(e) => edit(i, { ticker: e.target.value.toUpperCase() })}
              />
              <input
                aria-label={mode === 'usd' ? 'Amount in dollars' : 'Weight in percent'}
                className="amt"
                type="number"
                min={0}
                value={mode === 'usd' ? p.amount || '' : share ? +(share * 100).toFixed(1) : ''}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (mode === 'usd') edit(i, { amount: v })
                  else edit(i, { amount: (v / 100) * (total || 100000) })
                }}
              />
              <span className="share">{mode === 'usd' ? `${(share * 100).toFixed(0)}%` : usd(p.amount)}</span>
              <button className="icon" aria-label={`Remove ${p.ticker}`} onClick={() => { setSampleId(null); setPositions(positions.filter((_, k) => k !== i)) }}>×</button>
            </div>
          )
        })}
        <datalist id="tickers">
          {Object.values(funds).map((f) => (
            <option key={f.ticker} value={f.ticker}>{f.name}</option>
          ))}
        </datalist>
      </div>
      {missing.length > 0 && (
        <p className="warn-text small">
          No data for {missing.join(', ')}. Pick a supported ticker, or upload its holdings on the Data tab.
        </p>
      )}
      <div className="row gap">
        <button className="btn" onClick={() => { setSampleId(null); setPositions([...positions, { ticker: '', amount: 10000 }]) }}>+ Add fund</button>
        <button className="btn ghost" onClick={() => fileRef.current?.click()}>Upload CSV</button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            const parsed = parsePortfolioCsv(await f.text())
            if (parsed.length) {
              setSampleId(null)
              setPositions(parsed)
            } else alert('No rows found. Expected columns: ticker, amount')
            e.target.value = ''
          }}
        />
      </div>
      <p className="muted small">Total {usd(total)} · CSV columns: ticker, amount</p>
    </section>
  )
}
