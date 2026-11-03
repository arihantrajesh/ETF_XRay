import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Alloc } from '../lib/types'
import { duplicateShare, feeDrag, futureValue, weightedExpense } from '../lib/math'
import type { Row } from '../lib/math'
import { pct, usd } from '../lib/format'

export default function FeesView({ allocs, rows, total }: { allocs: Alloc[]; rows: Row[]; total: number }) {
  const [gross, setGross] = useState(7)
  const [annual, setAnnual] = useState(6000)
  const r = weightedExpense(allocs)
  const dup = duplicateShare(rows)
  const rDup = r * dup
  const g = gross / 100
  const horizons = [10, 20, 30]
  const series = Array.from({ length: 31 }, (_, y) => ({
    year: y,
    gross: futureValue(total, annual, g, y),
    net: futureValue(total, annual, g - r, y),
  }))
  return (
    <div className="stack">
      <section className="card">
        <h3>What your fund fees cost over time</h3>
        <div className="row gap wrap">
          <label className="field">Assumed gross return<span><input type="number" step="0.5" value={gross} onChange={(e) => setGross(Number(e.target.value))} /> %</span></label>
          <label className="field">Yearly contribution<span>$ <input type="number" step="500" value={annual} onChange={(e) => setAnnual(Number(e.target.value))} /></span></label>
          <div className="field">Starting balance<span><b>{usd(total)}</b></span></div>
          <div className="field">Weighted expense ratio<span><b>{pct(r, 3)}</b> / year</span></div>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Horizon</th><th className="num">Balance, no fees</th><th className="num">Balance after fees</th><th className="num">Fee drag</th></tr></thead>
            <tbody>
              {horizons.map((T) => {
                const d = feeDrag(total, annual, g, r, T)
                return <tr key={T}><td>{T} years</td><td className="num">{usd(d.vGross)}</td><td className="num">{usd(d.vNet)}</td><td className="num warn-text"><b>−{usd(d.gap)}</b></td></tr>
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card callout">
        <h3>The cost of paying for overlap</h3>
        <p>
          About <b>{pct(dup, 0)}</b> of your stock exposure is held through more than one fund beyond the largest holder. Fees on that slice
          (≈ {pct(rDup, 3)} / year) buy exposure you already own.
        </p>
        <div className="grid3">
          {horizons.map((T) => (
            <div key={T} className="stat"><small>{T} years</small><b>{usd(feeDrag(total, annual, g, rDup, T).gap)}</b><small className="muted">lost to redundant exposure</small></div>
          ))}
        </div>
        <p className="muted small">An estimate: expense ratio × duplicated share, compounded. It is not a prediction of returns.</p>
      </section>

      <section className="card">
        <h3>Growth with and without fees</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ left: 12, right: 12 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="year" unit="y" />
              <YAxis tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} width={64} />
              <Tooltip formatter={(v: number) => usd(v)} labelFormatter={(y) => `Year ${y}`} />
              <Area type="monotone" dataKey="gross" name="No fees" stroke="#9aa7bd" fill="#9aa7bd33" />
              <Area type="monotone" dataKey="net" name="After fees" stroke="#1d4ed8" fill="#1d4ed833" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
