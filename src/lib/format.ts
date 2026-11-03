export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`
export const usd = (x: number) =>
  x.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const daysOld = (iso: string) => Math.floor((Date.now() - new Date(iso + 'T00:00:00Z').getTime()) / 864e5)
