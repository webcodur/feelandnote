/**
 * 게이츠 09-10 등록 비도서 ko 카드 검증 — 기본 dry-run, `--apply`로 반영.
 * VIDEO는 TMDB ko-KR 제목, MUSIC은 iTunes 한국 스토어 표기와 글자 그대로 일치할 때만
 * sources.primary(tmdb·itunes)와 verified=true를 바로잡는다. GAME은 기존 GAME ko 관례(igdb)에 맞춘다.
 * 기록: data/celeb/figure-books/locale-gates-nonbook-verify-log.jsonl
 *
 * node --env-file=.env scripts/figure-books/locale-gates-nonbook-verify.mjs [--apply]
 */
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dbClient, sleep } from './lib/figure-work.mjs'

const APPLY = process.argv.includes('--apply')
const LOG = resolve(process.cwd(), '../../data/celeb/figure-books/locale-gates-nonbook-verify-log.jsonl')

async function main() {
  const db = dbClient()
  const key = process.env.TMDB_API_KEY
  const { data: ko, error } = await db.from('content_locales').select('*').eq('locale', 'ko').is('isbn', null)
    .gte('created_at', '2026-09-10').lt('created_at', '2026-09-11')
  if (error) throw new Error(error.message)
  const { data: ct } = await db.from('contents').select('id,type,external_id').in('id', ko.map((r) => r.content_id))
  const tm = new Map(ct.map((c) => [c.id, c]))
  const rows = ko.filter((r) => tm.get(r.content_id)?.type !== 'BOOK')

  const itunesKR = new Map()
  const music = rows.filter((r) => tm.get(r.content_id).type === 'MUSIC')
  for (let i = 0; i < music.length; i += 20) {
    const ids = music.slice(i, i + 20).map((r) => tm.get(r.content_id).external_id.replace('itunes-', ''))
    const res = await fetch(`https://itunes.apple.com/lookup?id=${ids.join(',')}&country=KR&entity=song`)
    const j = res.ok ? await res.json() : { results: [] }
    for (const x of j.results ?? []) itunesKR.set(String(x.trackId), x)
    await sleep(300)
  }

  const n = { tmdb: 0, itunes: 0, igdb: 0, skip: 0 }
  for (const r of rows) {
    const c = tm.get(r.content_id)
    let ok = false, primary = null, note = ''
    if (c.type === 'VIDEO') {
      const m = c.external_id.match(/^tmdb-(movie|tv)-(\d+)$/)
      const res = m ? await fetch(`https://api.themoviedb.org/3/${m[1]}/${m[2]}?api_key=${key}&language=ko-KR`) : null
      const j = res?.ok ? await res.json() : {}
      const kt = j.title ?? j.name
      ok = Boolean(kt) && kt === r.title; primary = 'tmdb'; note = `TMDB ko「${kt ?? ''}」`
    } else if (c.type === 'MUSIC') {
      const t = itunesKR.get(c.external_id.replace('itunes-', ''))
      ok = Boolean(t) && t.trackName === r.title; primary = 'itunes'; note = t ? `iTunes KR「${t.trackName}」` : 'KR 스토어 없음'
    } else if (c.type === 'GAME') {
      ok = true; primary = 'igdb'; note = 'IGDB 기본 영문 메타(기존 GAME ko 관례)'
    }
    if (!ok) { n.skip += 1; console.log(`  SKIP ${r.content_id.slice(0, 8)} ${c.type} 「${r.title}」 ${note}`); continue }
    const { source_locale, ...rest } = r.sources ?? {}
    const sources = { ...rest, primary }
    console.log(`  ${c.type.padEnd(5)} ${r.content_id.slice(0, 8)} 「${r.title}」 ${note} | primary ${r.sources?.primary}→${primary} verified ${r.verified}→true`)
    if (APPLY) {
      const u = await db.from('content_locales').update({ sources, verified: true }).eq('content_id', r.content_id).eq('locale', 'ko').select('locale')
      if (u.error || (u.data ?? []).length !== 1) throw new Error(`update ${r.content_id}: ${u.error?.message}`)
      appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), content_id: r.content_id, type: c.type, before: { sources: r.sources, verified: r.verified }, after: { sources, verified: true }, note })}\n`, 'utf8')
    }
    n[primary] += 1
  }
  console.log(`계획: tmdb ${n.tmdb} / itunes ${n.itunes} / igdb ${n.igdb} / skip ${n.skip}${APPLY ? ' — 반영 완료' : ' — dry-run이다. 반영하려면 --apply를 붙인다.'}`)
}

void main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
