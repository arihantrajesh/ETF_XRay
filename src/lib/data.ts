import type { DataIndex, Fund } from './types'

const base = import.meta.env.BASE_URL

async function getJson<T>(path: string, bust: boolean): Promise<T> {
  const res = await fetch(`${base}${path}${bust ? `?t=${Date.now()}` : ''}`, { cache: bust ? 'no-store' : 'default' })
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

/** Loads the manifest and every fund file it lists. `bust` bypasses caches to pick up a fresh deploy. */
export async function loadAll(bust = false): Promise<{ index: DataIndex; funds: Record<string, Fund> }> {
  const index = await getJson<DataIndex>('data/index.json', bust)
  const list = await Promise.all(
    index.funds.map((f) => getJson<Fund>(`data/etfs/${f.ticker}.json`, bust).catch(() => null)),
  )
  const funds: Record<string, Fund> = {}
  for (const f of list) if (f) funds[f.ticker] = f
  return { index, funds }
}
