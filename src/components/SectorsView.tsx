import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SectorRow } from '../lib/math'
import { title, UNCLASSIFIED } from '../lib/math'
import { pct } from '../lib/format'

export default function SectorsView({ sectors, hasBench }: { sectors: SectorRow[]; hasBench: boolean }) {
  const data = sectors.map((s) => ({ ...s, name: s.sector === UNCLASSIFIED ? 'Bonds / other' : title(s.sector) }))
  return (
    <div className="stack">
      <section className="card">
        <h3>Your true sector weights vs. the total market (VTI)</h3>
        <div style={{ width: '100%', height: Math.max(320, data.length * 42) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24 }}>
              <CartesianGrid horizontal={false} stroke="var(--line)" />
              <XAxis type="number" tickFormatter={(v) => pct(v, 0)} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => pct(v)} />
              <Legend />
              <Bar dataKey="portfolio" name="Your portfolio" fill="#1d4ed8" radius={[0, 3, 3, 0]} />
              {hasBench && <Bar dataKey="benchmark" name="Total market (VTI)" fill="#9aa7bd" radius={[0, 3, 3, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card">
        <h3>Over- and under-weights</h3>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Sector</th><th className="num">You</th><th className="num">Market</th><th className="num">Difference</th></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.sector}>
                  <td>{s.name}</td><td className="num">{pct(s.portfolio)}</td><td className="num">{pct(s.benchmark)}</td>
                  <td className={`num ${s.diff > 0.03 ? 'warn-text' : s.diff < -0.03 ? 'muted' : ''}`}>{s.diff > 0 ? '+' : ''}{(s.diff * 100).toFixed(1)} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
