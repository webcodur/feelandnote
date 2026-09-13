/**
 * FKO(한국어 제목 + 외국 ISBN) 역조회 — 읽기 전용.
 * node --env-file=.env scripts/figure-books/locale-fko-prep.mjs
 * 결과: data/celeb/figure-books/locale-fko-verdicts.jsonl
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { bareIsbn, dbClient, kakaoByIsbn } from './lib/figure-work.mjs'

const GATES = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
const OUT = resolve(process.cwd(), '../../data/celeb/figure-books/locale-fko-verdicts.jsonl')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const hasHangul = (s) => /[가-힣]/.test(String(s ?? ''))
const isKoreanIsbn = (v) => /^(97889|9791)/.test(bareIsbn(String(v ?? '').split(' ').find((s) => s.length >= 10) ?? ''))

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
  const done = new Set()
  if (existsSync(OUT)) for (const l of readFileSync(OUT, 'utf8').split('\n').filter(Boolean)) {
    try { done.add(JSON.parse(l).content_id) } catch { /* 무시 */ }
  }
  const targets = []
  const seenIsbn = new Set()
  for (let f = 0; ; f += 500) {
    const { data: works, error } = await db.from('contents').select('id').eq('type', 'BOOK').range(f, f + 499)
    if (error) throw new Error(error.message)
    if (!works.length) break
    const ids = works.map((w) => w.id).filter((id) => !gset.has(id))
    for (let i = 0; i < ids.length; i += 100) {
      const { data: locs } = await db.from('content_locales')
        .select('content_id,title,creator,publisher,isbn').eq('locale', 'ko').in('content_id', ids.slice(i, i + 100))
      for (const r of locs ?? []) {
        if (!hasHangul(r.title) || !r.isbn || isKoreanIsbn(r.isbn) || done.has(r.content_id)) continue
        const isbn13 = String(r.isbn).split(' ').map(bareIsbn).find((s) => /^(978|979)\d{10}$/.test(s))
        if (!isbn13 || seenIsbn.has(isbn13)) continue
        seenIsbn.add(isbn13)
        targets.push({ ...r, isbn13 })
      }
    }
    if (works.length < 500) break
  }
  console.log(`FKO 역조회 대상(ISBN 중복 제거): ${targets.length}`)
  const norm = (s) => String(s ?? '').replace(/\s*\([^)]+\)\s*$/, '').trim()
  let n = 0
  for (const t of targets) {
    n += 1
    const doc = await kakaoByIsbn(t.isbn13).catch(() => null)
    appendFileSync(OUT, `${JSON.stringify({
      content_id: t.content_id, isbn: t.isbn13,
      card: { title: t.title, creator: t.creator, publisher: t.publisher },
      kakao: doc ? { title: doc.title, authors: doc.authors, publisher: doc.publisher, status: doc.status } : null,
      verdict: !doc ? 'kakao_not_found' : (norm(doc.title) === norm(t.title) ? 'match' : 'MISMATCH'),
    })}\n`)
    if (n % 100 === 0) console.log(`  ${n}/${targets.length}`)
    await sleep(200)
  }
  console.log('완료')
}

void main().catch((e) => { console.error(e.message); process.exitCode = 1 })
