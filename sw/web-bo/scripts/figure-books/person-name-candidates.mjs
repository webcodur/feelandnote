/**
 * 인물 이름 카카오 후보 수집(인물 기준). 신규 인물의 한글·영문 이름으로 카카오 도서 검색을 돌려
 * 등장·창작 후보의 원료를 인물 단위로 수집한다. 판정은 후속 검수가 하며 DB는 읽기만 한다.
 *
 * 외부 조사 엔진 없이 도는 결정론적 경로다. `appearance-muse-candidates`가 모델에게 물어
 * 후보를 받는 것과 달리, 이 스크립트는 카카오 검색 결과를 그대로 모은다 — 결과가 없는 인물은
 * 다음 실행에 다시 잡히는 것이 아니라 '검색 결과 없음'으로 끝난다(카카오 색인 기준).
 *
 * node --env-file=.env scripts/figure-books/person-name-candidates.mjs --since 2026-09-18T00:00:00 --out ../../data/celeb/figure-books/person-name-2026-09-18.jsonl
 *
 * 중단되면 같은 --out으로 다시 실행한다. 이미 기록된 slug는 건너뛴다.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const PAGE_SIZE = 1000
const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
const kakaoKey = process.env.KAKAO_REST_API_KEY
if (!dbUrl || !dbKey) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
if (!kakaoKey) throw new Error('KAKAO_REST_API_KEY가 필요합니다.')

const db = createClient(dbUrl, dbKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function allRows(label, page) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    const current = data ?? []
    rows.push(...current)
    if (current.length < PAGE_SIZE) return rows
  }
}

async function loadTargets(since) {
  const celebs = await allRows('celebs', (from, to) => db
    .from('celebs')
    .select('id,slug,nickname,nickname_en,profession,headline,bio,celeb_reality')
    .gte('created_at', since)
    .order('id')
    .range(from, to))

  const relations = await allRows('figure_book_characters', (from, to) => db
    .from('figure_book_characters')
    .select('celeb_id,relation_type')
    .eq('relation_type', 'appearance')
    .order('celeb_id')
    .range(from, to))

  const hasAppearance = new Set(relations.map((row) => row.celeb_id))
  return celebs.filter((celeb) => !hasAppearance.has(celeb.id))
}

function bareIsbn(raw) {
  const parts = String(raw ?? '').split(/\s+/).filter(Boolean)
  return parts.find((part) => part.length === 13) ?? parts.find((part) => part.length === 10) ?? null
}

async function kakaoSearch(query, target) {
  const params = new URLSearchParams({ query, size: '50' })
  if (target) params.set('target', target)
  try {
    const response = await fetch(`${KAKAO_URL}?${params}`, {
      headers: { Authorization: `KakaoAK ${kakaoKey}` },
    })
    if (!response.ok) return { documents: [], error: `kakao_http_${response.status}` }
    const payload = await response.json()
    return { documents: payload.documents ?? [] }
  } catch (error) {
    return { documents: [], error: `kakao_fetch_${error instanceof Error ? error.message : error}` }
  }
}

async function main() {
  const outPath = resolve(process.cwd(), argumentValue('out', '../../data/celeb/figure-books/person-name-2026-09-18.jsonl'))
  const since = argumentValue('since', '2026-09-18T00:00:00')
  const limit = Number(argumentValue('limit', '0')) || 0
  const concurrency = Number(argumentValue('concurrency', '6'))
  const onlySlugs = (argumentValue('slugs', '') || '').split(',').map((v) => v.trim()).filter(Boolean)

  mkdirSync(dirname(outPath), { recursive: true })
  const done = new Set()
  if (existsSync(outPath)) {
    for (const line of readFileSync(outPath, 'utf8').split('\n')) {
      if (!line.trim()) continue
      try { done.add(JSON.parse(line).person.slug) } catch { /* 깨진 줄은 무시하고 다시 처리한다 */ }
    }
  }

  const all = await loadTargets(since)
  const scoped = onlySlugs.length ? all.filter((person) => onlySlugs.includes(person.slug)) : all
  const targets = (limit > 0 ? scoped.filter((person) => !done.has(person.slug)).slice(0, limit)
    : scoped.filter((person) => !done.has(person.slug)))
  console.log(`대상 ${all.length}명 / 완료 ${done.size}명 / 이번 실행 ${targets.length}명 (동시 ${concurrency})`)

  let processed = 0
  let withHits = 0
  let cursor = 0

  async function handle(person) {
    const names = [...new Set([person.nickname, person.nickname_en].map((v) => String(v ?? '').trim()).filter(Boolean))]
    const hits = new Map()
    const errors = []
    for (const name of names) {
      // 일반 검색은 제목·저자·본문 색인 전체를, person 대상은 저자·역자·삽화가 이름만 훑는다.
      const axes = [
        { via: 'general', target: null },
        { via: 'author', target: 'person' },
      ]
      for (const axis of axes) {
        const { documents, error } = await kakaoSearch(name, axis.target)
        if (error) { errors.push(error); continue }
        for (const doc of documents) {
          const isbn = bareIsbn(doc.isbn)
          const key = isbn ?? `${doc.title}|${(doc.authors ?? []).join(',')}`
          const existing = hits.get(key) ?? {
            title: doc.title,
            authors: doc.authors ?? [],
            translators: doc.translators ?? [],
            publisher: doc.publisher ?? null,
            isbn,
            isbnRaw: doc.isbn ?? null,
            datetime: doc.datetime ?? null,
            status: doc.status ?? null,
            price: doc.price ?? null,
            salePrice: doc.sale_price ?? null,
            url: doc.url ?? null,
            thumbnail: doc.thumbnail ?? null,
            contents: doc.contents ?? null,
            via: [],
          }
          if (!existing.via.includes(axis.via)) existing.via.push(axis.via)
          hits.set(key, existing)
        }
      }
    }
    if (hits.size === 0 && errors.length > 0 && names.length > 0) {
      // 검색 자체가 실패한 회차는 '없음'이 아니라 미조사다. 기록하지 않고 다음 실행에 넘긴다.
      if (errors.length >= names.length * 2) {
        console.log(`↻ ${person.nickname} — 카카오 오류(${errors[0]}), 다음 실행으로 미룬다`)
        return
      }
    }
    processed += 1
    if (hits.size > 0) withHits += 1
    appendFileSync(outPath, `${JSON.stringify({
      person: { id: person.id, slug: person.slug, nickname: person.nickname, nickname_en: person.nickname_en, profession: person.profession, celeb_reality: person.celeb_reality },
      hits: [...hits.values()],
      searchErrors: errors.length ? errors : undefined,
    })}\n`, 'utf8')
    console.log(`${hits.size > 0 ? '✔' : '·'} [${processed}/${targets.length}] ${person.nickname} — 히트 ${hits.size}`)
  }

  const worker = async () => {
    while (cursor < targets.length) {
      const person = targets[cursor]
      cursor += 1
      try {
        await handle(person)
      } catch (error) {
        console.log(`✖ ${person.nickname} — ${error instanceof Error ? error.message : error}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker))

  console.log(`\n처리 ${processed}명 / 히트 있음 ${withHits}명`)
  console.log(`WROTE ${outPath}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
