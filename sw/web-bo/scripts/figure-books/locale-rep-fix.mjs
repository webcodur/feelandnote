/**
 * 대표 ISBN 정합화 — 읽기 전용 기본, --apply로 반영.
 * ko 한국군 ISBN > en 영어군 ISBN 순으로 대표를 맞춘다. 둘 다 아니면 손대지 않는다.
 * node --env-file=.env scripts/figure-books/locale-rep-fix.mjs [--apply] [--gates]
 */
import { bareIsbn, dbClient } from './lib/figure-work.mjs'

const APPLY = process.argv.includes('--apply')
const GATES = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
const WITH_GATES = process.argv.includes('--gates')
const koGroup = (v) => /^(97889|9791)/.test(bareIsbn(String(v ?? '').split(' ').find((s) => s.length >= 10) ?? ''))
const engGroup = (v) => /^(9780|9781|9798)/.test(bareIsbn(String(v ?? '').split(' ').find((s) => s.length >= 10) ?? ''))

async function main() {
  const db = dbClient()
  const gset = new Set()
  if (!WITH_GATES) {
    for (const tbl of ['celeb_contents', 'figure_book_characters']) {
      for (let f = 0; ; f += 1000) {
        const { data } = await db.from(tbl).select('content_id').eq('celeb_id', GATES).range(f, f + 999)
        if (!data || !data.length) break
        data.forEach((r) => gset.add(r.content_id))
        if (data.length < 1000) break
      }
    }
  }
  let scanned = 0, fixed = 0, skipped = 0
  const foreignKo = []
  const batch = []
  for (let f = 0; ; f += 500) {
    const { data: works, error } = await db.from('contents').select('id,external_id,external_source').eq('type', 'BOOK').range(f, f + 499)
    if (error) throw new Error(error.message)
    if (!works.length) break
    batch.push(...works.filter((w) => !gset.has(w.id)))
    if (works.length < 500) break
  }
  for (let i = 0; i < batch.length; i += 100) {
    const chunk = batch.slice(i, i + 100)
    const { data: locs, error: e2 } = await db.from('content_locales')
      .select('content_id,locale,title,isbn').in('content_id', chunk.map((w) => w.id))
    if (e2) throw new Error(e2.message)
    const byId = new Map()
    for (const r of locs ?? []) {
      if (!byId.has(r.content_id)) byId.set(r.content_id, [])
      byId.get(r.content_id).push(r)
    }
    for (const w of chunk) {
      scanned += 1
      const locs = byId.get(w.id) ?? []
      const ko = locs.find((r) => r.locale === 'ko')
      const en = locs.find((r) => r.locale === 'en')
      if (ko && !koGroup(ko.isbn) && /[가-힣]/.test(ko.title ?? '')) {
        foreignKo.push({ id: w.id.slice(0, 8), title: ko.title, isbn: ko.isbn })
      }
      const ext = bareIsbn(w.external_id ?? '')
      const have = (locs ?? []).map((r) => bareIsbn(r.isbn ?? '')).filter(Boolean)
      if (ext.length >= 10 && !have.some((s) => s.includes(ext.slice(0, 10)) || ext.includes(s.slice(0, 10)))) {
        let rep = null
        if (ko?.isbn && koGroup(ko.isbn)) {
          const isbn13 = String(ko.isbn).split(' ').map(bareIsbn).find((s) => s.length === 13)
          if (isbn13) rep = { external_id: isbn13, external_source: 'kakao_book' }
        }
        if (!rep && en?.isbn && engGroup(en.isbn)) {
          const isbn13 = String(en.isbn).split(' ').map(bareIsbn).find((s) => s.length === 13)
          if (isbn13) rep = { external_id: isbn13, external_source: 'openlibrary' }
        }
        if (rep && APPLY) {
          const { error: e2 } = await db.from('contents').update(rep).eq('id', w.id)
          if (e2) {
            if (String(e2.message ?? '').includes('idx_contents_external_id')) { skipped += 1; continue }
            throw new Error(e2.message)
          }
        }
        if (rep) fixed += 1
        else skipped += 1
      }
    }
    if (scanned % 2000 === 0) console.log(`  scanned ${scanned} fixed ${fixed} skipped ${skipped}`)
  }
  console.log(`${APPLY ? '반영' : 'dry-run'}: scanned ${scanned} fixed ${fixed} skipped ${skipped}`)
  console.log(`한국어 제목+외국 ISBN ko카드: ${foreignKo.length}`);
  for (const r of foreignKo.slice(0, 30)) console.log(`  FKO ${r.id} | ${r.title} | ${r.isbn}`)
}

void main().catch((e) => { console.error(e.message); process.exitCode = 1 })
