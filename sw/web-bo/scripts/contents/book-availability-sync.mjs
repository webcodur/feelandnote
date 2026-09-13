/**
 * 절판 표식 동기화 — 기본 dry-run, `--apply`로 반영. 규칙은 celeb-02-02 「절판」.
 * 카카오 출처의 한국어판 행(isbn 있음)을 ISBN으로 다시 조회해 판매 상태가 `절판`이면 sources.availability='out_of_print'를 두고,
 * 표식이 있는데 지금은 `정상판매`·`품절`이면 표식을 뺀다. 판본 없는 표시용 행(primary 'none')은 손대지 않는다.
 * 카카오가 ISBN을 모르는 행은 판단하지 않는다(판매 종료인지 자료 누락인지 가릴 수 없다).
 * 백업: data/celeb/figure-books/availability-sync-backup.jsonl · 반영 목록: scripts/curated/.tmp/availability-touched.json
 *
 * node --env-file=.env scripts/contents/book-availability-sync.mjs [--apply] [--limit N]
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { argumentValue, dbClient, kakaoByIsbn } from '../figure-books/lib/figure-work.mjs'

const APPLY = process.argv.includes('--apply')
const LIMIT = Number(argumentValue('limit', '0'))
const BACKUP = resolve(process.cwd(), '../../data/celeb/figure-books/availability-sync-backup.jsonl')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const db = dbClient()
  const rows = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('content_locales').select('content_id,title,isbn,sources').eq('locale', 'ko').not('isbn', 'is', null).order('content_id').range(f, f + 999)
    if (error) throw new Error(error.message)
    rows.push(...data); if (data.length < 1000) break
  }
  let targets = rows.filter((r) => r.sources?.primary !== 'none' && /^\d{13}$/.test(String(r.isbn).replace(/-/g, '')))
  if (LIMIT) targets = targets.slice(0, LIMIT)
  console.log(`한국어판 행 ${rows.length} / 조회 대상 ${targets.length}`)
  const stat = { 절판: 0, 표식추가: 0, 표식제거: 0, 미조회: 0, 상태없음: 0 }
  const touched = new Set()
  for (const [i, r] of targets.entries()) {
    if (i % 500 === 0 && i > 0) console.log(`  ... ${i}/${targets.length} (추가 ${stat.표식추가} · 제거 ${stat.표식제거})`)
    let doc = null
    try { doc = await kakaoByIsbn(String(r.isbn).replace(/-/g, '')) } catch { doc = null }
    await sleep(110)
    if (!doc) { stat.미조회++; continue }
    const status = String(doc.status ?? '')
    if (!status) { stat.상태없음++; continue }
    const marked = r.sources?.availability === 'out_of_print'
    const outOfPrint = /절판/.test(status)
    if (outOfPrint) stat.절판++
    if (outOfPrint === marked) continue
    const sources = { ...(r.sources ?? {}) }
    if (outOfPrint) sources.availability = 'out_of_print'; else delete sources.availability
    console.log(`  ${outOfPrint ? '절판 ' : '해제 '} ${String(r.title).slice(0, 40)} (${status})`)
    if (APPLY) {
      const u = await db.from('content_locales').update({ sources }).eq('content_id', r.content_id).eq('locale', 'ko')
      if (u.error) throw new Error(`${r.content_id}: ${u.error.message}`)
      appendFileSync(BACKUP, `${JSON.stringify({ at: new Date().toISOString(), content_id: r.content_id, before: r.sources, after: sources, status })}\n`, 'utf8')
    }
    outOfPrint ? stat.표식추가++ : stat.표식제거++
    touched.add(r.content_id)
  }
  console.log(`\n카카오 절판 ${stat.절판} / 표식 추가 ${stat.표식추가} / 표식 제거 ${stat.표식제거} / 카카오 미조회 ${stat.미조회} / 상태 없음 ${stat.상태없음}${APPLY ? ' — 반영 완료' : ' — dry-run이다. 반영하려면 --apply를 붙인다.'}`)
  if (APPLY) { mkdirSync(resolve(process.cwd(), 'scripts/curated/.tmp'), { recursive: true }); writeFileSync(resolve(process.cwd(), 'scripts/curated/.tmp/availability-touched.json'), JSON.stringify({ contents: [...touched], lists: [] }), 'utf8') }
}
main().catch((e) => { console.error(e); process.exit(1) })
