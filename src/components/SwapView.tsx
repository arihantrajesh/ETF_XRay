import { useMemo, useState } from 'react'
import type { Alloc, Fund } from '../lib/types'
import { analyze, swapFund } from '../lib/math'
import type { Analysis } from '../lib/math'
import { pct } from '../lib/format'

export default function SwapView({ allocs, funds, base, bench }: { allocs: Alloc[]; funds: Record<string, Fund>; base: Analysis; bench: Fund | undefined }) {
  const owned = allocs.map((a) => a.fund.ticker)
  const [from, setFrom] = useState(owned[0] ?? '')
  const [to, setTo] = useState('')
  const src = owned.includes(from) ? from : owned[0] ?? ''

  const ranking = useMemo(
    () =>
      Object.values(funds)
        .filter((f) => f.ticker !== src && !f.custom)
        .map((f) => ({ f, an: analyze(swapFund(allocs, src, f), bench) }))
        .sort((a, b) => b.an.score.score - a.an.score.score),
    [allocs, funds, src, bench],
  )
  const pick = ranking.find((r) => r.f.ticker === to) ?? ranking[0]
  if (!allocs.length || !pick) return <section className="card"><p className="muted">Add a fund to your portfolio first.</p></section>
  const d = pick.an.score.score - base.score.score
  const cmp = (label: string, a: string, b: string) => <tr><td>{label}</td><td className="num">{a}</td><td className="num">{b}</td></tr>

  return (
    <div className="stack">
      <section className="card">
        <h3>What if I swapped one fund?</h3>
        <p className="muted small">A learning tool: see how the score responds when one holding changes. Not a recommendation to buy or sell anything.</p>
        <div className="row gap wrap">
          <label className="field">Replace<select value={src} onChange={(e) => setFrom(e.target.value)}>{owned.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="field">With<select value={pick.f.ticker} onChange={(e) => setTo(e.target.value)}>{ranking.map((r) => <option key={r.f.ticker} value={r.f.ticker}>{r.f.ticker}: {r.f.name}</option>)}</select></label>
        </div>
        <div className="swapscore">
          <div><small>Now</small><b>{base.score.score}</b></div>
          <span className="arrow">→</span>
          <div><small>After swap</small><b className={d >= 0 ? 'ok-text' : 'warn-text'}>{pick.an.score.score}</b></div>
          <div className={`delta ${d >= 0 ? 'ok-text' : 'warn-text'}`}>{d > 0 ? '+' : ''}{d} pts</div>
        </div>
        <div className="tablewrap">
          <table>
            <thead><tr><th /><th className="num">Current</th><th className="num">{src} → {pick.f.ticker}</th></tr></thead>
            <tbody>
              {cmp('Effective holdings (N_eff)', base.st.neff.toFixed(1), pick.an.st.neff.toFixed(1))}
              {cmp('Largest stock', base.st.maxStock ? `${base.st.maxStock.key} ${pct(base.st.maxStock.exposure)}` : '–', pick.an.st.maxStock ? `${pick.an.st.maxStock.key} ${pct(pick.an.st.maxStock.exposure)}` : '–')}
              {cmp('Top-10 share', pct(base.st.top10), pct(pick.an.st.top10))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h3>Every possible replacement for {src}, ranked by resulting score</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Replacement</th><th className="num">Score</th><th className="num">N_eff</th><th className="num">Top-10</th></tr></thead>
            <tbody>
              {ranking.slice(0, 12).map((r) => (
                <tr key={r.f.ticker} className="clickable" onClick={() => setTo(r.f.ticker)}>
                  <td><b>{r.f.ticker}</b> <span className="muted">{r.f.name}</span></td>
                  <td className="num">{r.an.score.score}</td><td className="num">{r.an.st.neff.toFixed(1)}</td><td className="num">{pct(r.an.st.top10, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">The score measures diversification only. It ignores risk tolerance, taxes, time horizon and return expectations.</p>
      </section>
    </div>
  )
}
