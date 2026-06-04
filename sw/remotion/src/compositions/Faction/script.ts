/**
 * 세력도(Faction) 에피소드 로더
 *
 * public/factions/{name}/data.{ko|en}.json 을 자동 스캔한다.
 * - episodes:     key → 스크립트 (en은 key 뒤에 '-en')
 * - episodeNames: key → 폴더명(이미지 경로 factions/{폴더명}/images/ 구성용)
 */

import type { FactionScript } from './types'

const ctx = require.context('../../../public/factions', true, /\/data\.(ko|en)\.json$/)
const KEY_RE = /^\.\/(.+)\/data\.(ko|en)\.json$/

export const episodes: Record<string, FactionScript> = {}
export const episodeNames: Record<string, string> = {}

for (const ctxKey of ctx.keys()) {
  const m = ctxKey.match(KEY_RE)
  if (!m) continue
  const [, name, locale] = m
  const epKey = locale === 'en' ? `${name}-en` : name
  episodes[epKey] = ctx(ctxKey) as FactionScript
  episodeNames[epKey] = name
}
