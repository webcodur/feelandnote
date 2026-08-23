import type { RankingScript } from './types'
import episodeRegistry from '../../../public/rankings/_episodes.json'

const ALLOW = new Set(episodeRegistry as string[])
const ctx = require.context('../../../public/rankings', true, /^\.\/[^/]+\/ranking-data\.json$/)
const KEY_RE = /^\.\/([^/]+)\/ranking-data\.json$/

export const episodes: Record<string, RankingScript> = {}
export const episodeNames: Record<string, string> = {}

for (const key of ctx.keys()) {
  const matched = key.match(KEY_RE)
  if (!matched) continue
  const folder = matched[1]
  if (!ALLOW.has(folder)) continue
  const script = ctx(key) as RankingScript
  episodes[folder] = script
  episodeNames[folder] = script.title.replace(/\n/g, ' ').trim() || folder
}
