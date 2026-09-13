/**
 * BOOK locale 결함 검증 — 읽기 전용. Gates 연결분과 비연결분을 분리 집계한다.
 * node --env-file=.env scripts/figure-books/locale-verify.mjs
 */
import { bareIsbn, dbClient } from './lib/figure-work.mjs'

const GATES = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
// 표시용 제목 행 표식. sources.title은 옛 등록 경로에서 제목 출처 URL로도 쓰이므로 값으로 가른다.
const isDisplayMark = (v) => ['translated', 'romanized', 'original'].includes(String(v ?? ''))
const noHangul = (s) => !/[가-힣]/.test(String(s ?? ''))
const engGroup = (v) => /^(9780|9781|9798)/.test(bareIsbn(String(v ?? '').split(' ').find((s) => s.length >= 10) ?? ''))

async function main() {
  const db = dbClient()
  const gset = new Set()
  for (const tbl of ['celeb_contents', 'figure_book_characters']) {
    for (let f = 0; ; f += 1000) {
      const { data, error } = await db.from(tbl).select('content_id').eq('celeb_id', GATES).range(f, f + 999)
      if (error) throw new Error(error.message)
      if (!data || !data.length) break
      data.forEach((r) => gset.add(r.content_id))
      if (data.length < 1000) break
    }
  }
  const groups = { gates: [], rest: [] }
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('contents').select('id,external_id').eq('type', 'BOOK').range(f, f + 999)
    if (error) throw new Error(error.message)
    if (!data || !data.length) break
    data.forEach((r) => (gset.has(r.id) ? groups.gates : groups.rest).push(r))
    if (data.length < 1000) break
  }
  for (const [name, works] of Object.entries(groups)) {
    const locs = []
    const ids = works.map((r) => r.id)
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await db.from('content_locales')
        .select('content_id,locale,title,isbn,description,sources').in('content_id', ids.slice(i, i + 100))
      if (error) throw new Error(error.message)
      locs.push(...data)
    }
    const ko = locs.filter((r) => r.locale === 'ko')
    const en = locs.filter((r) => r.locale === 'en')
    const koT = ko.filter((r) => noHangul(r.title))
    const koD = ko.filter((r) => r.description && !['KAKAO', 'DAUM', 'OPEN'].includes(r.description) && noHangul(r.description))
    // 대표 ISBN 정합: external_id가 자국 locale ISBN 어디에도 없으면 기록
    const byId = new Map()
    locs.forEach((r) => {
      if (!byId.has(r.content_id)) byId.set(r.content_id, [])
      if (r.isbn) byId.get(r.content_id).push(bareIsbn(r.isbn))
    })
    const repOdd = works.filter((w) => {
      const ext = bareIsbn(w.external_id ?? '')
      // 카드에 ISBN이 하나도 없는 작품(표시용 제목 행만 있는 작품)은 불일치가 아니라 부재다
      if (!(byId.get(w.id) ?? []).length) return false
      return ext.length >= 10 && !(byId.get(w.id) ?? []).some((s) => s.includes(ext.slice(0, 10)) || ext.includes(s.slice(0, 10)))
    }).map((w) => w.id.slice(0, 8))
    console.log(`== ${name} (works ${works.length})`)
    console.log(`  koEnTitle: ${koT.length}`, koT.slice(0, 12).map((r) => `${r.content_id.slice(0, 8)}:${(r.title || '').slice(0, 28)}/${r.isbn || 'null'}`).join(' | '))
    console.log(`  koStoredDesc: ${koD.length}`, koD.slice(0, 8).map((r) => `${r.content_id.slice(0, 8)}:${(r.title || '').slice(0, 28)}`).join(' | '))
    console.log(`  koNullIsbn: ${ko.filter((r) => !r.isbn && !isDisplayMark(r.sources?.title)).length} (표시용 제목 행 ${ko.filter((r) => !r.isbn && isDisplayMark(r.sources?.title)).length} 제외)`)
    console.log(`  enNonEng: ${en.filter((r) => r.isbn && !engGroup(r.isbn)).length}`)
    console.log(`  repMismatch: ${repOdd.length}`, repOdd.slice(0, 15).join(','))
  }
}

void main().catch((e) => { console.error(e.message); process.exitCode = 1 })
