/**
 * 세력도(Faction) 에피소드 로더
 *
 * public/factions/{name}/data.json 한 파일을 스캔한다(한국어 필드 + 영문 필드 *En 병기).
 * 한 파일에서 ko/en 두 벌의 스크립트를 펼친다.
 * - episodes:     key → 펼친 스크립트 (en은 key 뒤에 '-en')
 * - episodeNames: key → 폴더명(이미지 경로 factions/{폴더명}/images/ 구성용)
 *
 * 영문판 치환: name←nameEn, lines←linesEn 등. 영문 값이 없으면 한국어 값으로 폴백한다.
 */

import type { FactionScript, FactionGroup, FactionCluster, FactionPerson } from './types'
// 등록 에피소드 화이트리스트 — 폴더에 data.json이 있어도 이 목록에 없으면 컴포지션으로 노출하지 않는다.
import episodeRegistry from '../../../public/factions/_episodes.json'

const ALLOW = new Set(episodeRegistry as string[])
const ctx = require.context('../../../public/factions', true, /\/data\.json$/)
const KEY_RE = /^\.\/(.+)\/data\.json$/

export const episodes: Record<string, FactionScript> = {}
export const episodeNames: Record<string, string> = {}

/**
 * 인물 펼치기. en=false면 원본 그대로(한국어판 — quoteEn은 렌더러가 보조 표기로 사용).
 * en=true면 영문 필드를 주 필드로 올리고 보조 영문(quoteEn)은 제거한다.
 */
function resolvePerson(p: FactionPerson, en: boolean): FactionPerson {
  if (!en) {
    // 한국어판: 의역(quote) 아래 보조 표기를 가공 영문이 아니라 실제 원문(quoteOrigin)으로
    return { ...p, quoteEn: p.quoteOrigin }
  }
  return {
    ...p,
    name: p.nameEn ?? p.name,
    epithet: p.epithetEn ?? p.epithet,
    lines: p.linesEn ?? p.lines,
    quote: p.quoteEn ?? p.quote,
    quoteChunks: p.quoteEnChunks ?? p.quoteChunks,
    quoteEn: undefined,
  }
}

function resolveCluster(c: FactionCluster, en: boolean): FactionCluster {
  if (!en) return c
  return {
    ...c,
    label: c.labelEn ?? c.label,
    note: c.noteEn ?? c.note,
    people: c.people.map(p => resolvePerson(p, en)),
  }
}

function resolveGroup(g: FactionGroup, en: boolean): FactionGroup {
  return {
    ...g,
    name: en ? (g.nameEn ?? g.name) : g.name,
    tagline: en ? (g.taglineEn ?? g.tagline) : g.tagline,
    clusters: g.clusters?.map(c => resolveCluster(c, en)),
    people: g.people.map(p => resolvePerson(p, en)),
  }
}

/** data.json → 단일 언어 스크립트. en=false는 원본 그대로 반환한다. */
function resolveScript(data: FactionScript, en: boolean): FactionScript {
  if (!en) return data
  return {
    ...data,
    title: data.titleEn ?? data.title,
    subtitle: data.subtitleEn ?? data.subtitle,
    outroTitle: data.outroTitleEn ?? data.outroTitle,
    outroNote: data.outroNoteEn ?? data.outroNote,
    groups: data.groups.map(g => resolveGroup(g, en)),
  }
}

for (const ctxKey of ctx.keys()) {
  const m = ctxKey.match(KEY_RE)
  if (!m) continue
  const name = m[1]
  if (!ALLOW.has(name)) continue // 등록 목록(_episodes.json)에 없는 폴더는 건너뛴다
  const data = ctx(ctxKey) as FactionScript
  episodes[name] = resolveScript(data, false)
  episodeNames[name] = name
  episodes[`${name}-en`] = resolveScript(data, true)
  episodeNames[`${name}-en`] = name
}
