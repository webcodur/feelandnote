/**
 * 죽은 BOOK 작품 정리 — 기본 dry-run, `--apply`로 반영.
 * 언어 카드가 0장이고 어떤 관계·기록에도 참조되지 않는 BOOK contents 행을 지운다.
 * (전역 locale 큐가 en 없는 작품의 ko 카드를 지우면서 생긴 빈 작품이 대상이다.)
 * 참조 확인: celeb_contents · figure_book_characters · figure_book_contents · figure_book_editions · member_contents · curated_list_items · flow_nodes · records · notes.
 * 원행은 data/celeb/figure-books/locale-dead-works-backup.jsonl에 보관한다.
 *
 * node --env-file=.env scripts/figure-books/locale-dead-works.mjs [--apply]
 */
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dbClient } from './lib/figure-work.mjs'

const APPLY = process.argv.includes('--apply')
const BACKUP = resolve(process.cwd(), '../../data/celeb/figure-books/locale-dead-works-backup.jsonl')
// contents를 FK로 가리키는 표 전부다. 26.09.11 기관 선정 목록(curated_list_items)을 빼고 돌려 목록에 연결된 작품 93건이 지워졌다.
const REF_TABLES = ['celeb_contents', 'figure_book_characters', 'figure_book_contents', 'figure_book_editions', 'member_contents', 'curated_list_items', 'flow_nodes', 'records', 'notes']

async function main() {
  const db = dbClient()
  // 훑는 단계는 가벼운 컬럼만 읽는다. 전체 행은 삭제 대상에 한해 백업 직전에 읽는다(게이트웨이 시간초과 방지).
  const works = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('contents').select('id,external_id,created_at').eq('type', 'BOOK').range(f, f + 999)
    if (error) throw new Error(error.message)
    if (!data?.length) break
    works.push(...data)
    if (data.length < 1000) break
  }
  const ids = works.map((w) => w.id)
  const hasLocale = new Set()
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db.from('content_locales').select('content_id').in('content_id', ids.slice(i, i + 100))
    if (error) throw new Error(error.message)
    data.forEach((r) => hasLocale.add(r.content_id))
  }
  const none = works.filter((w) => !hasLocale.has(w.id))
  const referenced = new Set()
  for (const tbl of REF_TABLES) {
    for (let i = 0; i < none.length; i += 200) {
      const { data, error } = await db.from(tbl).select('content_id').in('content_id', none.slice(i, i + 200).map((w) => w.id))
      if (error) throw new Error(`${tbl}: ${error.message}`)
      data.forEach((r) => referenced.add(r.content_id))
    }
  }
  const dead = none.filter((w) => !referenced.has(w.id))
  const byBatch = {}
  for (const w of dead) { const d = String(w.created_at ?? '').slice(0, 10); byBatch[d] = (byBatch[d] ?? 0) + 1 }
  console.log(`BOOK ${works.length} / 카드 0장 ${none.length} / 그중 참조 있음 ${none.length - dead.length} / 삭제 대상 ${dead.length}`)
  console.log(`  생성일: ${Object.entries(byBatch).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  ')}`)
  for (const w of dead.slice(0, 8)) console.log(`  예: ${w.id.slice(0, 8)} ext=${w.external_id}`)
  if (!APPLY) { console.log('dry-run이다. 반영하려면 --apply를 붙인다.'); return }

  let n = 0
  for (let i = 0; i < dead.length; i += 100) {
    const { data: full, error } = await db.from('contents').select('*').in('id', dead.slice(i, i + 100).map((w) => w.id))
    if (error) throw new Error(`backup fetch: ${error.message}`)
    for (const w of full ?? []) appendFileSync(BACKUP, `${JSON.stringify({ at: new Date().toISOString(), content: w })}\n`, 'utf8')
  }
  for (const w of dead) {
    const r = await db.from('contents').delete().eq('id', w.id).select('id')
    if (r.error) { console.log(`  FAIL ${w.id.slice(0, 8)}: ${r.error.message}`); continue }
    n += (r.data ?? []).length
  }
  const { count } = await db.from('contents').select('id', { count: 'exact', head: true }).in('id', dead.slice(0, 500).map((w) => w.id))
  console.log(`삭제 ${n}건. 재조회 잔존 ${count ?? '?'}건. 백업: ${BACKUP}`)
}

void main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
