import type { Alert } from '../lib/math'
import type { Thresholds } from '../lib/types'
import { AlertList } from './Overview'

export const DEFAULT_THRESHOLDS: Thresholds = { single: 0.05, top10: 0.4, sector: 0.4, overlap: 0.5 }

const FIELDS: { k: keyof Thresholds; label: string; min: number; max: number; hint: string }[] = [
  { k: 'single', label: 'Single stock', min: 1, max: 20, hint: 'Alert if one stock exceeds this share of your portfolio' },
  { k: 'top10', label: 'Top-10 stocks', min: 10, max: 80, hint: 'Alert if your 10 biggest stocks exceed this share' },
  { k: 'sector', label: 'Single sector', min: 10, max: 80, hint: 'Alert if one sector exceeds this share' },
  { k: 'overlap', label: 'Fund-pair overlap', min: 10, max: 95, hint: 'Alert if two of your funds overlap more than this' },
]

export default function AlertsView({ alerts, th, setTh }: { alerts: Alert[]; th: Thresholds; setTh: (t: Thresholds) => void }) {
  return (
    <div className="grid2">
      <section className="card">
        <h3>Thresholds</h3>
        <p className="muted small">Drag a slider: alerts re-evaluate instantly and new ones pop up as toasts.</p>
        {FIELDS.map((f) => (
          <label key={f.k} className="slider">
            <div className="row between"><span>{f.label}</span><b className="num">{Math.round(th[f.k] * 100)}%</b></div>
            <input type="range" min={f.min} max={f.max} value={Math.round(th[f.k] * 100)} onChange={(e) => setTh({ ...th, [f.k]: Number(e.target.value) / 100 })} />
            <small className="muted">{f.hint}</small>
          </label>
        ))}
        <button className="btn ghost" onClick={() => setTh(DEFAULT_THRESHOLDS)}>Reset to defaults</button>
      </section>
      <section className="card">
        <h3>Active alerts <span className="pill">{alerts.length}</span></h3>
        <AlertList alerts={alerts} />
      </section>
    </div>
  )
}
