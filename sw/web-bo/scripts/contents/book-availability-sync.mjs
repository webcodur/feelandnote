/**
 * 절판 표식 동기화 — 기본 dry-run, `--apply`로 반영. 규칙은 celeb-02-02 「절판」.
 * 카카오 출처의 한국어판 행(isbn 있음)을 ISBN으로 다시 조회해 판매 상태가 `절판`이면 sources.availability='out_of_print'를 두고,
 * 표식이 있는데 지금은 `정상판매`·`품절`이면 표식을 뺀다. 판본 없는 표시용 행(primary 'none')은 손대지 않는다.
 * 카카오가 상태를 비우거나 ISBN을 모르면 `--aladin` 일 때 알라딘 상품 페이지(schema.org availability + 「절판」 문구)로 가른다.
 * 백업: data/celeb/figure-books/availability-sync-backup.jsonl · 반영 목록: scripts/curated/.tmp/availability-touched.json
 *
 * node --env-file=.env scripts/contents/book-availability-sync.mjs [--aladin] [--apply] [--limit N]
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { argumentValue, dbClient, kakaoByIsbn } from '../figure-books/lib/figure-work.mjs'

const APPLY = process.argv.includes('--apply')
const ALADIN = process.argv.includes('--aladin')
const LIMIT = Number(argumentValue('limit', '0'))
const BACKUP = resolve(process.cwd(), '../../data/celeb/figure-books/availability-sync-backup.jsonl')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 알라딘 상품 페이지의 판매 상태. '절판' | '품절' | '정상판매' | '' (상품 없음·판독 불가).
 * schema.org offers.availability 가 OutOfStock 이고 구매 상자에 「절판」이 있으면 절판, OutOfStock 만이면 품절, InStock 이면 정상판매.
 */
async function aladinStatus(isbn) {
  try {
    const res = await fetch(`https://www.aladin.co.kr/shop/wproduct.aspx?ISBN=${isbn}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', 'Accept-Language': 'ko-KR,ko;q=0.9' }, signal: AbortSignal.timeout(20000) })
    if (!res.ok) return ''
    const html = await res.text()
    const avail = /"availability"\s*:\s*"https?:\/\/schema\.org\/(\w+)"/.exec(html)?.[1] ?? ''
    if (avail === 'InStock') return '정상판매'
    if (avail !== 'OutOfStock') return ''
    return /절판되었습니다|품절\(절판\)|절판된 도서/.test(html) ? '절판' : '품절'
  } catch { return '' }
}

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
  const stat = { 절판: 0, 표식추가: 0, 표식제거: 0, 미조회: 0, 상태없음: 0, 알라딘판정: 0 }
  const touched = new Set()
  for (const [i, r] of targets.entries()) {
    if (i % 500 === 0 && i > 0) console.log(`  ... ${i}/${targets.length} (추가 ${stat.표식추가} · 제거 ${stat.표식제거})`)
    const isbn = String(r.isbn).replace(/-/g, '')
    let doc = null
    try { doc = await kakaoByIsbn(isbn) } catch { doc = null }
    await sleep(110)
    let status = String(doc?.status ?? '')
    if (!doc) stat.미조회++
    // 카카오가 상태를 비워 두면(실측 906건) 알라딘 상품 페이지로 가른다 — schema.org availability 와 「절판」 문구를 함께 본다.
    // 실측(26.09.13): 카카오 상태가 빈 표본 4권은 알라딘에서 전부 OutOfStock+절판, 정상판매 2권은 InStock 이었다.
    if (!status && ALADIN) { status = await aladinStatus(isbn); await sleep(400); if (status) stat.알라딘판정++ }
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
