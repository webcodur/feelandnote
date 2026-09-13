/**
 * 전역 ISBN 역조회(Growth형 검출) — 읽기 전용.
 * 한국어 ISBN을 가진 ko 카드 전체를 카카오로 재조회해 돌아온 제목과 카드 제목을 대조한다.
 * 재개 가능: 출력 JSONL에 있는 content_id는 건너뛴다.
 *
 * node --env-file=.env scripts/figure-books/locale-roundtrip-prep.mjs
 * 결과: data/celeb/figure-books/locale-roundtrip-verdicts.jsonl
 */
import { existsSync, readFileSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { bareIsbn, dbClient, kakaoByIsbn } from './lib/figure-work.mjs'

const OUT = resolve(process.cwd(), '../../data/celeb/figure-books/locale-roundtrip-verdicts.jsonl')
const squash = (v) => String(v ?? '').normalize('NFKC').toLowerCase().replace(/[\s·:;,.!?'"`~「」『』<>\-–—_/\\[\]{}()·]/g, '')

async function main() {
  const db = dbClient()
  const done = new Set()
  if (existsSync(OUT)) for (const line of readFileSync(OUT, 'utf8').split('\n')) {
    if (line.trim()) { try { done.add(JSON.parse(line).content_id) } catch { /* 무시 */ } }
  }
  const ids = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('contents').select('id').eq('type', 'BOOK').order('id').range(f, f + 999)
    if (error) throw new Error(error.message)
    ids.push(...data.map((r) => r.id))
    if (data.length < 1000) break
  }
  const targets = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('content_locales')
      .select('content_id,title,creator,publisher,isbn').eq('locale', 'ko').in('content_id', ids.slice(i, i + 200))
    if (error) throw new Error(error.message)
    for (const r of (data ?? []).filter((x) => /^(97889|97911)/.test(bareIsbn((x.isbn ?? '').split(' ').find((s) => s.length >= 10) ?? '')))) {
      if (!done.has(r.content_id)) targets.push(r)
    }
  }
  console.log(`ko 한국어판 카드 (완료 ${done.size} 제외, 이번 ${targets.length})`)
  let mismatch = 0
  let cursor = 0
  const CONC = 4
  const worker = async () => {
    while (cursor < targets.length) {
      const t = targets[cursor]
      cursor += 1
      const isbn13 = (t.isbn ?? '').split(' ').map(bareIsbn).find((s) => s.length === 13)
      try {
        const doc = await kakaoByIsbn(isbn13).catch(() => null)
        if (!doc) { appendFileSync(OUT, `${JSON.stringify({ content_id: t.content_id, verdict: 'kakao_not_found', cardTitle: t.title, isbn: isbn13 })}\n`); continue }
        const same = squash(doc.title) === squash(t.title) || squash(doc.title).startsWith(squash(t.title)) || squash(t.title).startsWith(squash(doc.title))
        appendFileSync(OUT, `${JSON.stringify({
          content_id: t.content_id, verdict: same ? 'match' : 'MISMATCH',
          cardTitle: t.title, cardCreator: t.creator, isbn: isbn13,
          kakaoTitle: doc.title, kakaoAuthors: doc.authors, kakaoPublisher: doc.publisher, kakaoStatus: doc.status,
        })}\n`)
        if (!same) { mismatch += 1; console.log(`✖ ${t.title.slice(0, 30)} [${isbn13}] → 카카오: ${doc.title.slice(0, 30)}`) }
      } catch (e) {
        console.log(`  재시도 필요 ${t.content_id.slice(0, 8)}: ${e.message}`)
        cursor -= 0 // 다음 실행에서 재개 (기록 없음)
      }
      if (cursor % 500 === 0) console.log(`  ${cursor}/${targets.length} (불일치 ${mismatch})`)
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker))
  console.log(`완료. 불일치 ${mismatch}`)
}

void main().catch((e) => { console.error(e); process.exitCode = 1 })
