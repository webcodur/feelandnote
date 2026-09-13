/**
 * ko NULL ISBN 트리아제 — 읽기 전용. 카카오 제목 검색 + 저자 일치로 ISBN 후보 수집.
 * 단일 확정 anything: 저자 일치 1건 + 제목 코어 일치 → fill, 그 외 review.
 * node --env-file=.env scripts/figure-books/locale-nullisbn-prep.mjs
 * 결과: data/celeb/figure-books/locale-nullisbn-plan.json + review 목록 stdout
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { bareIsbn, dbClient } from './lib/figure-work.mjs'

const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'
const GATES = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const core = (s) => String(s ?? '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/[\s·:;,.!?'"`~「」『』\-–—_/\\[\]{}]/g, '').toLowerCase()
const normAu = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase()

async function kakaoTitle(q) {
  const key = process.env.KAKAO_REST_API_KEY
  const params = new URLSearchParams({ query: q, size: '10', target: 'title' })
  for (let a = 0; a < 3; a += 1) {
    try {
      const res = await fetch(`${KAKAO_URL}?${params}`, { headers: { Authorization: `KakaoAK ${key}` } })
      if (res.ok) return (await res.json()).documents ?? []
    } catch { /* 재시도 */ }
    await sleep(1000 * (a + 1))
  }
  return null
}

async function main() {
  const db = dbClient()
  const gset = new Set()
  for (const tbl of ['celeb_contents', 'figure_book_characters']) {
    for (let f = 0; ; f += 1000) {
      const { data } = await db.from(tbl).select('content_id').eq('celeb_id', GATES).range(f, f + 999)
      if (!data || !data.length) break
      data.forEach((r) => gset.add(r.content_id))
      if (data.length < 1000) break
    }
  }
  const all = []
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('contents').select('id').eq('type', 'BOOK').range(f, f + 999)
    if (!data || !data.length) break
    data.forEach((r) => { if (!gset.has(r.id)) all.push(r.id) })
    if (data.length < 1000) break
  }
  const targets = []
  for (let i = 0; i < all.length; i += 100) {
    const { data } = await db.from('content_locales')
      .select('content_id,title,creator').eq('locale', 'ko').in('content_id', all.slice(i, i + 100)).is('isbn', null)
    targets.push(...(data ?? []))
  }
  console.log(`ko NULL ISBN (Gates 제외): ${targets.length}`)
  const fill = {}
  const review = []
  let n = 0
  for (const t of targets) {
    n += 1
    const docs = await kakaoTitle(t.title)
    if (docs === null) { review.push({ id: t.content_id, title: t.title, reason: 'api-fail' }); continue }
    const koDocs = docs.filter((d) => String(d.isbn ?? '').split(' ').some((s) => /^(97889|9791)/.test(bareIsbn(s))))
    const auTokens = String(t.creator ?? '').split(/[,·]/).map((s) => normAu(s)).filter((s) => s.length > 1)
    const hits = koDocs.filter((d) => {
      const names = normAu([...(d.authors ?? []), ...(d.translators ?? [])].join(' '))
      return auTokens.some((a) => a && (names.includes(a) || a.includes(names.split(',')[0])));
    })
    const exact = hits.filter((d) => { const c = core(d.title); const t0 = core(t.title); return c && t0 && (c === t0 || c.startsWith(t0) || t0.startsWith(c)) })
    if (exact.length === 1) {
      const isbn13 = String(exact[0].isbn).split(' ').map(bareIsbn).find((s) => s.length === 13)
      if (isbn13) { fill[t.content_id] = isbn13; continue }
    }
    review.push({ id: t.content_id.slice(0, 8), title: t.title, creator: t.creator, cands: hits.slice(0, 4).map((d) => `${d.title}/${(d.authors ?? []).join(',')}/${d.isbn}/${d.status}`) })
    if (n % 50 === 0) console.log(`  ${n}/${targets.length} (fill ${Object.keys(fill).length})`)
    await sleep(200)
  }
  writeFileSync(resolve(process.cwd(), '../../data/celeb/figure-books/locale-nullisbn-plan.json'),
    JSON.stringify({ fill, reviewIds: review.map((r) => r.id) }, null, 1))
  console.log(`fill ${Object.keys(fill).length} / review ${review.length}`)
  for (const r of review.slice(0, 60)) console.log(`REVIEW ${r.id} | ${r.title} | ${r.creator} | ${r.reason ?? (r.cands ?? []).join(' ;; ')}`)
}

void main().catch((e) => { console.error(e.message); process.exitCode = 1 })
