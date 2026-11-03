import { useState } from 'react'
import type { DataIndex, Fund } from '../lib/types'
import { parseHoldingsCsv } from '../lib/csv'
import { daysOld, pct } from '../lib/format'

interface Props {
  index: DataIndex | null
  funds: Record<string, Fund>
  refresh: () => Promise<string>
  addCustom: (f: Fund) => void
  removeCustom: (t: string) => void
  repo: string
}

export default function DataView({ index, funds, refresh, addCustom, removeCustom, repo }: Props) {
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [tk, setTk] = useState('')
  const [er, setEr] = useState(0.1)
  const [err, setErr] = useState('')
  const list = Object.values(funds).sort((a, b) => Number(!!a.custom) - Number(!!b.custom) || a.ticker.localeCompare(b.ticker))

  return (
    <div className="stack">
      <section className="card">
        <div className="row between wrap gap">
          <div>
            <h3>Data freshness</h3>
            <p className="muted small">
              Holdings come from Alpha Vantage <code>ETF_PROFILE</code>, fetched by a scheduled GitHub Action into static JSON.
              Manifest generated {index ? new Date(index.generated_at).toLocaleString() : '…'}.
            </p>
          </div>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => { setBusy(true); setMsg(await refresh()); setBusy(false) }}
          >{busy ? 'Checking…' : '↻ Refresh data'}</button>
        </div>
        {msg && <p className="ok-text small">{msg}</p>}
        <div className="tablewrap">
          <table>
            <thead><tr><th>ETF</th><th>Data as of</th><th>Coverage</th><th className="num">Expense</th><th /></tr></thead>
            <tbody>
              {list.map((f) => {
                const age = daysOld(f.as_of)
                const partial = f.covered_weight < 0.97
                return (
                  <tr key={f.ticker}>
                    <td><b>{f.ticker}</b> <span className="muted hide-sm">{f.name}</span></td>
                    <td>{f.as_of} {!f.custom && age > 7 && <span className="tag warn">stale · {age}d</span>}{f.custom && <span className="tag">uploaded</span>}</td>
                    <td>
                      {f.no_holdings ? <>No itemised holdings from data source <span className="tag warn">bond fund</span></> : <>
                        Top {f.holdings.length.toLocaleString()}{f.total_holdings > f.holdings.length ? ` of ${f.total_holdings.toLocaleString()}` : ''} holdings, <b>{pct(f.covered_weight, 1)}</b> of fund
                        {partial && <span className="tag warn">partial</span>}</>}
                    </td>
                    <td className="num">{pct(f.expense_ratio, 2)}</td>
                    <td>{f.custom && <button className="link" onClick={() => removeCustom(f.ticker)}>remove</button>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          “Refresh data” re-downloads the JSON from this site, picking up whatever the latest scheduled run committed. The schedule runs daily;
          the repo owner can also trigger it by hand from the <a href={`${repo}/actions/workflows/refresh-data.yml`} target="_blank" rel="noreferrer">Actions tab</a>.
          Where a fund shows partial coverage, every figure is computed on the holdings we have and is a lower bound.
        </p>
      </section>

      <section className="card">
        <h3>Add an ETF we don’t have (CSV fallback)</h3>
        <p className="muted small">Upload that fund’s holdings as two columns: <code>ticker, weight</code> (weights as % or fractions). It is merged into every calculation in your browser only.</p>
        <div className="row gap wrap">
          <label className="field">ETF ticker<input value={tk} maxLength={8} onChange={(e) => setTk(e.target.value.toUpperCase())} placeholder="MYETF" /></label>
          <label className="field">Expense ratio %<input type="number" step="0.01" value={er} onChange={(e) => setEr(Number(e.target.value))} /></label>
          <label className="btn ghost upload">Choose holdings CSV
            <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (!tk) { setErr('Enter the ETF ticker first.'); return }
              const f = parseHoldingsCsv(await file.text(), tk, er / 100)
              if (!f.holdings.length) { setErr('No valid rows found (need ticker, weight).'); return }
              setErr('')
              addCustom(f)
              setMsg(`Added ${f.ticker} with ${f.holdings.length} holdings. Use it on the portfolio panel.`)
            }} />
          </label>
        </div>
        {err && <p className="warn-text small">{err}</p>}
      </section>
    </div>
  )
}
