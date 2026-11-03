import { Fragment, useMemo, useState } from 'react'
import type { Row } from '../lib/math'
import { pct } from '../lib/format'

type SortKey = 'exposure' | 'key' | 'funds'

export default function HoldingsTable({ rows, tickers }: { rows: Row[]; tickers: string[] }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('exposure')
  const [asc, setAsc] = useState(false)
  const [limit, setLimit] = useState(50)
  const [open, setOpen] = useState<string | null>(null)

  const view = useMemo(() => {
    const needle = q.trim().toUpperCase()
    const f = needle ? rows.filter((r) => r.key.includes(needle) || r.name.toUpperCase().includes(needle)) : rows
    const dir = asc ? 1 : -1
    return [...f].sort((a, b) =>
      sort === 'key' ? dir * a.key.localeCompare(b.key)
      : sort === 'funds' ? dir * (a.parts.length - b.parts.length || a.exposure - b.exposure)
      : dir * (a.exposure - b.exposure))
  }, [rows, q, sort, asc])

  const th = (k: SortKey, label: string) => (
    <th onClick={() => (sort === k ? setAsc(!asc) : (setSort(k), setAsc(k === 'key')))} className="sortable" aria-sort={sort === k ? (asc ? 'ascending' : 'descending') : 'none'}>
      {label} {sort === k ? (asc ? '▲' : '▼') : ''}
    </th>
  )

  return (
    <section className="card">
      <div className="row between wrap gap">
        <h3>Look-through holdings <span className="muted">({rows.length.toLocaleString()} unique positions)</span></h3>
        <input className="search" placeholder="Search ticker or company…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search holdings" />
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>#</th>{th('key', 'Holding')}{th('exposure', 'True weight')}{th('funds', 'Funds')}
              {tickers.map((t) => <th key={t} className="num hide-sm">{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {view.slice(0, limit).map((r, i) => {
              const byT = Object.fromEntries(r.parts.map((p) => [p.ticker, p.contrib]))
              return (
                <Fragment key={r.key}>
                  <tr onClick={() => setOpen(open === r.key ? null : r.key)} className="clickable">
                    <td className="muted">{i + 1}</td>
                    <td><b>{r.key.length > 8 ? '' : r.key}</b> <span className="muted">{r.name !== r.key ? r.name : r.key.length > 8 ? r.key : ''}</span></td>
                    <td className="num"><div className="bar-cell"><i style={{ width: `${Math.min(100, (r.exposure / (rows[0]?.exposure || 1)) * 100)}%` }} /><span>{pct(r.exposure, 2)}</span></div></td>
                    <td className="num">{r.parts.length}</td>
                    {tickers.map((t) => <td key={t} className="num hide-sm">{byT[t] ? pct(byT[t], 2) : <span className="muted">–</span>}</td>)}
                  </tr>
                  {open === r.key && (
                    <tr className="detail">
                      <td colSpan={4 + tickers.length}>
                        {r.parts.map((p) => `${p.ticker}: ${pct(p.contrib, 2)} (${pct(p.h, 2)} of the fund)`).join('  ·  ')}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {view.length > limit && <button className="btn ghost" onClick={() => setLimit(limit + 100)}>Show more ({view.length - limit} left)</button>}
      {view.length === 0 && <p className="muted">No holdings match “{q}”.</p>}
    </section>
  )
}
