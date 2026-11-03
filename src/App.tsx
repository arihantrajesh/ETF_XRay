import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DataIndex, Fund, Position, Thresholds } from './lib/types'
import { loadAll } from './lib/data'
import { analyze, buildAlerts, toAllocs, weightedExpense } from './lib/math'
import { SAMPLES } from './lib/samples'
import { pct } from './lib/format'
import PortfolioPanel from './components/PortfolioPanel'
import Overview from './components/Overview'
import HoldingsTable from './components/HoldingsTable'
import OverlapView from './components/OverlapView'
import SectorsView from './components/SectorsView'
import AlertsView, { DEFAULT_THRESHOLDS } from './components/AlertsView'
import FeesView from './components/FeesView'
import SwapView from './components/SwapView'
import DataView from './components/DataView'
import Methodology from './components/Methodology'

const REPO = 'https://github.com/arihantrajesh/ETF_XRay'
const TABS = [
  ['overview', 'Overview'], ['holdings', 'Look-through'], ['overlap', 'Overlap'], ['sectors', 'Sectors'],
  ['alerts', 'Alerts'], ['fees', 'Fee drag'], ['swap', 'What if'], ['data', 'Data'], ['method', 'Methodology'],
] as const

const tabFromHash = () => {
  const h = window.location.hash.replace(/^#\/?/, '')
  return TABS.some(([k]) => k === h) ? h : 'overview'
}

export default function App() {
  const [tab, setTab] = useState(tabFromHash)
  const [index, setIndex] = useState<DataIndex | null>(null)
  const [baseFunds, setBaseFunds] = useState<Record<string, Fund>>({})
  const [custom, setCustom] = useState<Record<string, Fund>>({})
  const [loadErr, setLoadErr] = useState('')
  const [positions, setPositions] = useState<Position[]>(SAMPLES[0].positions)
  const [sampleId, setSampleId] = useState<string | null>(SAMPLES[0].id)
  const [th, setTh] = useState<Thresholds>(DEFAULT_THRESHOLDS)
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])

  useEffect(() => {
    const on = () => setTab(tabFromHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = (t: string) => { window.location.hash = `/${t}`; window.scrollTo({ top: 0 }) }

  useEffect(() => {
    loadAll().then((d) => { setIndex(d.index); setBaseFunds(d.funds) }).catch((e) => setLoadErr(String(e.message ?? e)))
  }, [])

  const funds = useMemo(() => ({ ...baseFunds, ...custom }), [baseFunds, custom])
  const { allocs, missing, total } = useMemo(() => toAllocs(positions, funds), [positions, funds])
  const bench = funds['VTI']
  const an = useMemo(() => analyze(allocs, bench), [allocs, bench])
  const alerts = useMemo(() => buildAlerts(allocs, an.rows, an.sectors, th, an.matrix), [allocs, an, th])

  // Live alerts: toast whenever an alert newly appears after a change.
  const seen = useRef<Set<string> | null>(null)
  useEffect(() => {
    if (!Object.keys(funds).length) return
    const ids = new Set(alerts.map((a) => a.id))
    if (seen.current) {
      const fresh = alerts.filter((a) => !seen.current!.has(a.id)).slice(0, 3)
      fresh.forEach((a, k) => {
        const id = Date.now() + k
        setToasts((t) => [...t, { id, text: a.text }].slice(-4))
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000)
      })
    }
    seen.current = ids
  }, [alerts, funds])

  const refresh = useCallback(async () => {
    try {
      const before = index?.funds ?? []
      const d = await loadAll(true)
      setIndex(d.index); setBaseFunds(d.funds)
      const changed = d.index.funds.filter((f) => before.find((b) => b.ticker === f.ticker)?.fetched_at !== f.fetched_at).length
      return `Checked ${new Date().toLocaleTimeString()}: ${d.index.funds.length} funds loaded, ${changed} newer than before.`
    } catch (e) {
      return `Refresh failed: ${(e as Error).message}`
    }
  }, [index])

  const ready = Object.keys(funds).length > 0
  const hasPortfolio = allocs.length > 0

  return (
    <div className="app">
      <header className="top">
        <div className="brand"><span className="logo">◐</span><div><h1>ETF X-Ray</h1><p>See what your ETFs really own</p></div></div>
        <div className="top-meta">
          {index && <span className="stamp" title="Latest holdings snapshot">Data as of {index.funds.map((f) => f.as_of).sort().slice(-1)[0]}</span>}
          <button className="btn ghost sm" onClick={() => go('data')}>↻ Data & refresh</button>
        </div>
      </header>
      <div className="disclaimer" role="note">Educational tool only, not investment advice. Figures are estimates from public fund data and may be delayed or incomplete.</div>

      <nav className="tabs" aria-label="Sections">
        {TABS.map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)} aria-current={tab === k ? 'page' : undefined}>
            {label}{k === 'alerts' && alerts.length > 0 && <span className="count">{alerts.length}</span>}
          </button>
        ))}
      </nav>

      {loadErr && <div className="card warn-text">Could not load fund data: {loadErr}</div>}
      {!ready && !loadErr && <div className="card muted">Loading fund data…</div>}

      {ready && (
        <main className="layout">
          <aside>
            <PortfolioPanel positions={positions} setPositions={setPositions} funds={funds} missing={missing} sampleId={sampleId} setSampleId={setSampleId} />
            {hasPortfolio && <p className="muted small side-note">Weighted expense ratio {pct(weightedExpense(allocs), 3)} · {allocs.length} fund{allocs.length === 1 ? '' : 's'}</p>}
          </aside>
          <div className="content">
            {!hasPortfolio && tab !== 'data' && tab !== 'method' ? (
              <section className="card"><h3>Add a fund to begin</h3><p className="muted">Pick a sample portfolio or enter tickers and dollar amounts on the left.</p></section>
            ) : (
              <>
                {tab === 'overview' && <Overview an={an} allocs={allocs} alerts={alerts} onTab={go} />}
                {tab === 'holdings' && <HoldingsTable rows={an.rows} tickers={allocs.map((a) => a.fund.ticker)} />}
                {tab === 'overlap' && <OverlapView allocs={allocs} matrix={an.matrix} />}
                {tab === 'sectors' && <SectorsView sectors={an.sectors} hasBench={!!bench} />}
                {tab === 'alerts' && <AlertsView alerts={alerts} th={th} setTh={setTh} />}
                {tab === 'fees' && <FeesView allocs={allocs} rows={an.rows} total={total} />}
                {tab === 'swap' && <SwapView allocs={allocs} funds={funds} base={an} bench={bench} />}
                {tab === 'data' && <DataView index={index} funds={funds} refresh={refresh} repo={REPO}
                  addCustom={(f) => setCustom((c) => ({ ...c, [f.ticker]: f }))}
                  removeCustom={(t) => setCustom((c) => { const n = { ...c }; delete n[t]; return n })} />}
                {tab === 'method' && <Methodology />}
              </>
            )}
            {!hasPortfolio && tab === 'data' && <DataView index={index} funds={funds} refresh={refresh} repo={REPO} addCustom={(f) => setCustom((c) => ({ ...c, [f.ticker]: f }))} removeCustom={(t) => setCustom((c) => { const n = { ...c }; delete n[t]; return n })} />}
            {!hasPortfolio && tab === 'method' && <Methodology />}
          </div>
        </main>
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast">⚠ {t.text}</div>)}
      </div>
      <footer>
        <p>Educational only. Not investment advice, not a recommendation to buy or sell any security. Past holdings do not predict future results.</p>
        <p><a href={REPO} target="_blank" rel="noreferrer">Source on GitHub</a> · Data: Alpha Vantage ETF_PROFILE · Built for Duke FMKT 256</p>
      </footer>
    </div>
  )
}
