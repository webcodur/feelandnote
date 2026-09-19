/** Google Books key pool with per-key daily counters.
 * Each key gets its own free-tier quota (~1,000/day); rotation across the
 * stored keys is a deliberate user-approved exception for this collection.
 * Counters persist per-key so a restarted run cannot overspend one key.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const DAILY_CAP = 950
const fp = (key: string) => createHash('sha1').update(key).digest('hex').slice(0, 8)

export interface KeyPool {
  next(): { key: string; id: string } | null
  spend(id: string): void
  dead(id: string): void
  exhausted(id: string): void
  stats(): Record<string, unknown>
}

export function createKeyPool(stateFile: string, extraEnvFiles: string[] = []): KeyPool {
  const keys = Object.keys(process.env)
    .filter(k => /^GOOGLE_BOOKS_API_KEY/.test(k))
    .map(k => process.env[k]!.trim())
  for (const file of extraEnvFiles) {
    if (!fs.existsSync(file)) continue
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/^GOOGLE_BOOKS_API_KEY_?\d*=(.+)$/gm)) keys.push(m[1].trim())
  }
  const usable = keys.filter(Boolean)
  if (!usable.length) throw new Error('GOOGLE_BOOKS_API_KEY_* missing')
  const unique = [...new Set(usable)]
  const load = () => {
    const today = new Date().toISOString().slice(0, 10)
    const s = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {}
    if (s.date !== today) return { date: today, usage: {}, dead: {} }
    return s
  }
  const save = (s: any) => fs.writeFileSync(stateFile, JSON.stringify(s))
  return {
    next() {
      const s = load()
      for (const key of unique) {
        const id = fp(key)
        if (s.dead?.[id]) continue
        if ((s.usage?.[id] ?? 0) >= DAILY_CAP) continue
        return { key, id }
      }
      return null
    },
    spend(id) {
      const s = load()
      s.usage = s.usage ?? {}
      s.usage[id] = (s.usage[id] ?? 0) + 1
      save(s)
    },
    dead(id) {
      const s = load()
      s.dead = { ...(s.dead ?? {}), [id]: true }
      save(s)
    },
    exhausted(id) {
      const s = load()
      s.usage = s.usage ?? {}
      s.usage[id] = DAILY_CAP
      save(s)
    },
    stats() {
      const s = load()
      return { keys: unique.length, ...s }
    },
  }
}

export function keyPoolStateFile(dir: string) {
  return path.join(dir, 'gbooks-state.json')
}
