import type { BookPersonScript } from './types'

const ctx = require.context('../../../public/book-person', true, /\/ko\.json$/)
const KEY_RE = /^\.\/(.+)\/ko\.json$/

export const episodes: Record<string, BookPersonScript> = {}

for (const key of ctx.keys()) {
  const m = key.match(KEY_RE)
  if (!m) continue
  const name = m[1]
  if (name.includes('/')) continue
  episodes[name] = ctx(key) as BookPersonScript
}
