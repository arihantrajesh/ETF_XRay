import { Fragment } from 'react'
import type { Alloc } from '../lib/types'
import { pct } from '../lib/format'

export default function OverlapView({ allocs, matrix }: { allocs: Alloc[]; matrix: number[][] }) {
  if (allocs.length < 2)
    return <section className="card"><h3>Overlap matrix</h3><p className="muted">Add at least two funds to see how much they overlap.</p></section>
  const shade = (v: number, diag: boolean) =>
    diag ? 'var(--cell-diag)' : `color-mix(in srgb, var(--accent) ${Math.round(8 + v * 92)}%, var(--card))`
  const pairs: { a: string; b: string; v: number }[] = []
  for (let i = 0; i < allocs.length; i++)
    for (let j = i + 1; j < allocs.length; j++) pairs.push({ a: allocs[i].fund.ticker, b: allocs[j].fund.ticker, v: matrix[i][j] })
  pairs.sort((x, y) => y.v - x.v)
  return (
    <div className="stack">
      <section className="card">
        <h3>Pairwise overlap</h3>
        <p className="muted">Overlap(A,B) = Σ min(weight in A, weight in B). 100% means the funds hold identical stocks in identical proportions.</p>
        <div className="heat" style={{ gridTemplateColumns: `auto repeat(${allocs.length}, minmax(54px, 1fr))` }}>
          <div />
          {allocs.map((a) => <div key={a.fund.ticker} className="hl">{a.fund.ticker}</div>)}
          {allocs.map((r, i) => (
            <Fragment key={'r' + i}>
              <div className="hl left">{r.fund.ticker}</div>
              {allocs.map((c, j) => (
                <div key={i + '-' + j} className="hc" style={{ background: shade(matrix[i][j], i === j), color: matrix[i][j] > 0.55 && i !== j ? '#fff' : 'var(--text)' }}
                  title={`${r.fund.ticker} vs ${c.fund.ticker}: ${pct(matrix[i][j])}`}>
                  {i === j ? '—' : pct(matrix[i][j], 0)}
                </div>
              ))}
            </Fragment>
          ))}
        </div>
        <div className="scale"><span>0%</span><i /><span>100%</span></div>
      </section>
      <section className="card">
        <h3>Most redundant pairs</h3>
        <ul className="pairs">
          {pairs.slice(0, 5).map((p) => (
            <li key={p.a + p.b}><b>{p.a} + {p.b}</b><div className="meter"><i style={{ width: pct(p.v, 0) }} /></div><span className="num">{pct(p.v, 0)}</span></li>
          ))}
        </ul>
        <p className="muted small">When two funds hold mostly the same stocks, owning both adds fees and complexity but little extra diversification. Funds truncated to their top holdings give a lower bound on true overlap.</p>
      </section>
    </div>
  )
}
