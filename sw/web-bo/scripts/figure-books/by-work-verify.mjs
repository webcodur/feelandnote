/**
 * 작품 기준 조사의 브라우저 답변을 등록 인물 명단과 대조한다. 읽기 전용이다.
 *
 * 모델이 뱉은 인물명은 그대로 믿지 않는다. 서비스에 없는 인물이 섞이고 동명이인이 붙는다
 * (figure-book-curation 스킬 「조사 단위」). 여기서 by-work-index.json 의 이름표와 맞는 것만 남긴다.
 *
 * 입력은 표준입력이며 한 줄에 하나씩 아래 형식을 받는다. 구글 답변을 그대로 붙여 넣으면 된다.
 *   작품명 > 인물1, 인물2, 인물3
 *   작품명 > 없음
 *
 * 실행 (sw/web-bo 에서):
 *   node --env-file=.env scripts/figure-books/by-work-verify.mjs < answer.txt
 *   node --env-file=.env scripts/figure-books/by-work-verify.mjs --out ../../data/celeb/figure-books/by-work-2026-09-07.jsonl < answer.txt
 */

import { appendFileSync, readFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const INDEX_PATH = resolve(process.cwd(), '../../data/celeb/figure-books/by-work-index.json')
const arg = (n, d = null) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d }
const outPath = arg('out')

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const norm = (v) => String(v ?? '').toLowerCase().replace(/[\s·,()[\]{}'"·’-]/g, '')
const { index, works } = JSON.parse(readFileSync(INDEX_PATH, 'utf8'))

/** 작품명으로 등록 작품을 찾는다. 저자 표기가 붙어 와도 앞부분으로 맞춘다. */
function findWork(title) {
  const k = norm(title)
  return works.find((w) => norm(w.title) === k)
    ?? works.find((w) => k.startsWith(norm(w.title)) || norm(w.title).startsWith(k))
    ?? null
}

/** 「-340」·「1986-05-21」 둘 다 받아 연도만 돌려준다 */
function bornYear(raw) {
  const m = String(raw ?? '').match(/^(-?\d{1,4})/)
  return m ? Number(m[1]) : null
}

/**
 * 동명이인을 작품 맥락으로 가른다. 같은 책에 단독으로 확정된 인물들의 국적과 연대가 그 작품의
 * 좌표이므로, 후보 중 그 좌표에 드는 것이 하나뿐이면 그것을 채택한다. 둘 이상이면 보류한다.
 */
function disambiguate(found, context, profileOf) {
  if (context.length === 0) return null
  const counts = new Map()
  for (const p of context) if (p.nationality) counts.set(p.nationality, (counts.get(p.nationality) ?? 0) + 1)
  const [topNation] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? []
  const years = context.map((p) => p.year).filter((y) => y !== null)
  const lo = years.length ? Math.min(...years) - 300 : null
  const hi = years.length ? Math.max(...years) + 300 : null

  const fits = found.filter((f) => {
    const p = profileOf.get(f.slug)
    if (!p) return false
    if (topNation && p.nationality && p.nationality !== topNation) return false
    if (lo !== null && p.year !== null && (p.year < lo || p.year > hi)) return false
    return true
  })
  return fits.length === 1 ? fits[0] : null
}

async function main() {
  const text = readFileSync(0, 'utf8')
  if (outPath) mkdirSync(dirname(resolve(outPath)), { recursive: true })

  // 이미 걸린 관계는 신규에서 뺀다
  const existing = new Set()
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('figure_book_characters').select('content_id,celeb_id').range(f, f + 999)
    if (error) throw new Error(error.message)
    for (const r of data) existing.add(`${r.content_id}:${r.celeb_id}`)
    if (data.length < 1000) break
  }
  // 인물이 3천 명을 넘는다. 한 번에 받으면 1,000행에서 잘려 celebId 가 빈 채로 관계가 만들어진다.
  const celebs = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from('celebs').select('id,slug,nationality,birth_date').order('id').range(f, f + 999)
    if (error) throw new Error(error.message)
    celebs.push(...data)
    if (data.length < 1000) break
  }
  const idOf = new Map(celebs.map((c) => [c.slug, c.id]))
  const profileOf = new Map(celebs.map((c) => [c.slug, { nationality: c.nationality, year: bornYear(c.birth_date) }]))

  let known = 0, unknown = 0, fresh = 0, noWork = 0, held = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line.includes('>')) continue
    const title = line.slice(0, line.indexOf('>')).trim()
    const rest = line.slice(line.indexOf('>') + 1).trim()
    if (!title || !rest) continue

    const work = findWork(title)
    if (!work) { noWork++; console.log(`✖ 작품 미등록: ${title}`); continue }
    if (/^없음/.test(rest)) { console.log(`· ${work.title} — 없음`); continue }

    const names = rest.split(/[,、]/).map((n) => n.trim()).filter(Boolean)
    const hits = []
    const context = []
    const ambiguous = []
    const take = (person) => {
      known++
      const celebId = idOf.get(person.slug)
      const p = profileOf.get(person.slug)
      if (p) context.push(p)
      const key = `${work.contentId}:${celebId}`
      if (existing.has(key)) return
      fresh++
      hits.push({ slug: person.slug, nickname: person.nickname, celebId })
    }
    for (const name of names) {
      const found = index[norm(name)]
      if (!found) { unknown++; continue }
      if (found.length > 1) { ambiguous.push([name, found]); continue }
      take(found[0])
    }
    // 단독 확정 인물이 만든 좌표로 동명이인을 가른다
    for (const [name, found] of ambiguous) {
      const picked = disambiguate(found, context, profileOf)
      if (picked) { console.log(`  → ${work.title} — "${name}" 동명 ${found.length}명 중 ${picked.slug} 채택`); take(picked) }
      else { held++; console.log(`  ? ${work.title} — "${name}" 동명 ${found.length}명: ${found.map((f) => f.slug).join(', ')}`) }
    }
    if (hits.length) {
      console.log(`✔ ${work.title} — 신규 ${hits.length}명: ${hits.map((h) => h.nickname).join(', ')}`)
      if (outPath) appendFileSync(resolve(outPath), JSON.stringify({ contentId: work.contentId, title: work.title, people: hits }) + '\n', 'utf8')
    } else {
      console.log(`· ${work.title} — 신규 없음 (응답 ${names.length}명)`)
    }
  }
  console.log(`\n등록 인물 일치 ${known}명 · 명단 밖 ${unknown}명 · 신규 관계 ${fresh}건 · 작품 미등록 ${noWork}건 · 동명 보류 ${held}건`)
}

main()
