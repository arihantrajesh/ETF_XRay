import type { Alert, Analysis } from '../lib/math'
import type { Alloc } from '../lib/types'
import { pct } from '../lib/format'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { palette } from '../lib/palette'

export function ScoreGauge({ score, tone }: { score: number; tone: string }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 140 140" className="gauge" role="img" aria-label={`Diversification score ${score} out of 100`}>
      <circle cx="70" cy="70" r={r} className="gauge-bg" />
      <circle
        cx="70" cy="70" r={r} className={`gauge-fg ${tone}`}
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 70 70)"
      />
      <text x="70" y="68" textAnchor="middle" className="gauge-num">{score}</text>
      <text x="70" y="90" textAnchor="middle" className="gauge-sub">out of 100</text>
    </svg>
  )
}

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length)
    return <p className="ok-text">✓ No alerts: your portfolio is inside every threshold you set.</p>
  return (
    <ul className="alerts">
      {alerts.map((a) => (
        <li key={a.id} className={`alert ${a.level}`}>
          <span className="badge">{a.level === 'high' ? 'HIGH' : 'WATCH'}</span>
          <span>{a.text}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Overview({ an, allocs, alerts, onTab }: { an: Analysis; allocs: Alloc[]; alerts: Alert[]; onTab: (t: string) => void }) {
  const { st, score, rows } = an
  const top = rows.filter((r) => r.type === 's').slice(0, 10)
  const tickers = allocs.map((a) => a.fund.ticker)
  const data = top.map((r) => {
    const o: Record<string, number | string> = { name: r.key, total: r.exposure }
    r.parts.forEach((p) => (o[p.ticker] = p.contrib))
    return o
  })
  const paper = rows.filter((r) => r.type === 's').length
  return (
    <div className="stack">
      <section className="card hero">
        <div className="hero-text">
          <p className="eyebrow">The headline</p>
          <h2 className="headline">
            You own <b>{paper.toLocaleString()}</b> stocks on paper, but your portfolio behaves like it holds only <b>{st.neff.toFixed(0)}</b>.
          </h2>
          <p className="muted">
            Effective number of holdings N<sub>eff</sub> = 1 / HHI = {st.neff.toFixed(1)}. Your top 10 stocks are {pct(st.top10)} of the portfolio
            {st.maxStock && <>, led by <b>{st.maxStock.key}</b> at {pct(st.maxStock.exposure)}</>}.
            {st.equityShare < 0.995 && <> Stocks are {pct(st.equityShare)} of your money; the rest is bonds/cash/uncovered.</>}
          </p>
        </div>
        <div className="hero-score">
          <ScoreGauge score={score.score} tone={score.tone} />
          <p className={`verdict ${score.tone}`}>{score.verdict}</p>
        </div>
      </section>

      <div className="grid2">
        <section className="card">
          <h3>Where the score comes from</h3>
          <ul className="parts">
            {score.parts.map((p) => (
              <li key={p.label}>
                <div className="row between"><span>{p.label}</span><span className="num">{p.points.toFixed(0)} / {p.max}</span></div>
                <div className="meter"><i style={{ width: `${(p.points / p.max) * 100}%` }} /></div>
                <small className="muted">{p.detail}</small>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="row between"><h3>Live alerts</h3><button className="link" onClick={() => onTab('alerts')}>Edit thresholds →</button></div>
          <AlertList alerts={alerts.slice(0, 6)} />
          {alerts.length > 6 && <p className="muted small">+ {alerts.length - 6} more on the Alerts tab</p>}
        </section>
      </div>

      <section className="card">
        <h3>Top 10 true holdings, and which of your funds supply them</h3>
        <div style={{ width: '100%', height: 340 }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
              <XAxis type="number" tickFormatter={(v) => pct(v, 0)} />
              <YAxis type="category" dataKey="name" width={56} />
              <Tooltip formatter={(v: number) => pct(v, 2)} />
              {tickers.map((t, i) => (
                <Bar key={t} dataKey={t} stackId="a" fill={palette[i % palette.length]} name={t}>
                  {data.map((_, k) => <Cell key={k} />)}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="legend">
          {tickers.map((t, i) => (
            <span key={t}><i style={{ background: palette[i % palette.length] }} />{t}</span>
          ))}
        </div>
      </section>
    </div>
  )
}
