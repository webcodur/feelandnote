/**
 * 등록된 작품에 인물 등장 관계를 붙일 후보·검수 파일을 만든다. DB는 건드리지 않는다.
 * 작품 등록 영수증(manifests/*.receipt.json)에서 contentId를 거두고,
 * 검수 대기표에서 그 ISBN을 지목한 인물과 등장 범위를 붙인다.
 *
 * node scripts/figure-books/appearance-relations.mjs
 * → figure-books:apply-reviewed --candidates <후보> --reviews <검수> 로 dry-run한다.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { dirname, resolve } from 'node:path'

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function bareIsbn(value) {
  return String(value ?? '').replace(/[\s-]/g, '')
}

async function main() {
  const manifestDir = resolve(process.cwd(), argumentValue('manifests', '../../data/celeb/figure-books/manifests'))
  const queuePath = resolve(process.cwd(), argumentValue('queue', '../../data/celeb/figure-books/appearance-review-queue-2026-09-04.json'))
  const candidatesOut = resolve(process.cwd(), argumentValue('candidates-out', '../../data/celeb/figure-books/appearance-apply-candidates.json'))
  const reviewsOut = resolve(process.cwd(), argumentValue('reviews-out', '../../data/celeb/figure-books/appearance-apply-reviews.json'))

  // ISBN → contentId는 DB가 원본이다. 영수증은 단건 등록 경로만 남기므로 대량 등록분을 놓친다.
  const byIsbn = new Map()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('contents')
      .select('id,external_id')
      .eq('type', 'BOOK')
      .eq('external_source', 'kakao_book')
      .order('id')
      .range(from, from + 999)
    if (error) throw new Error(`작품 조회 실패: ${error.message}`)
    for (const row of data ?? []) {
      const isbn = bareIsbn(row.external_id)
      if (isbn) byIsbn.set(isbn, row.id)
    }
    if ((data ?? []).length < 1000) break
  }
  // 판본 표에도 ISBN이 있다. 외부 ID 없이 등록된 옛 작품은 이쪽에서 찾는다.
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('figure_book_editions')
      .select('content_id,isbn')
      .eq('locale', 'ko')
      .order('id')
      .range(from, from + 999)
    if (error) throw new Error(`판본 조회 실패: ${error.message}`)
    for (const row of data ?? []) {
      const isbn = bareIsbn(row.isbn)
      if (isbn && !byIsbn.has(isbn)) byIsbn.set(isbn, row.content_id)
    }
    if ((data ?? []).length < 1000) break
  }

  const queue = JSON.parse(readFileSync(queuePath, 'utf8'))
  const rows = [...(queue.fresh ?? []), ...(queue.reuse ?? [])]

  const candidates = []
  const bySlug = new Map()
  const skipped = []

  for (const row of rows) {
    const isbn = bareIsbn(row.kakao?.isbn)
    const contentId = row.contentId ?? byIsbn.get(isbn) ?? null
    if (!contentId) {
      skipped.push({ isbn, title: row.kakao?.title ?? row.title, reason: 'content_not_registered' })
      continue
    }
    const scope = String(row.scope ?? '').trim()
    if (!scope) {
      skipped.push({ isbn, title: row.kakao?.title ?? row.title, reason: 'appearance_description_missing' })
      continue
    }

    candidates.push({
      person: { id: row.person.id, slug: row.person.slug },
      book: {
        contentId,
        title: row.kakao?.title ?? row.title,
        isbn,
        verified: true,
        sources: { primary: 'kakao_book' },
      },
    })

    const selections = bySlug.get(row.person.slug) ?? []
    if (!selections.some((selection) => selection.contentId === contentId)) {
      selections.push({
        contentId,
        relationType: 'appearance',
        description: scope,
        rationale: `조사에서 확인한 등장 범위: ${scope}`,
      })
    }
    bySlug.set(row.person.slug, selections)
  }

  const reviews = [...bySlug].map(([slug, selections]) => ({ slug, selections }))

  for (const file of [candidatesOut, reviewsOut]) mkdirSync(dirname(file), { recursive: true })
  writeFileSync(candidatesOut, JSON.stringify({ candidates }, null, 2), 'utf8')
  writeFileSync(reviewsOut, JSON.stringify({ reviews }, null, 2), 'utf8')

  console.log(`등록된 작품 ${byIsbn.size}권 / 관계 후보 ${candidates.length}건 / 인물 ${reviews.length}명 / 건너뜀 ${skipped.length}건`)
  const reasons = {}
  for (const row of skipped) reasons[row.reason] = (reasons[row.reason] ?? 0) + 1
  if (skipped.length > 0) console.log('  건너뛴 사유:', JSON.stringify(reasons))
  console.log(`WROTE ${candidatesOut}`)
  console.log(`WROTE ${reviewsOut}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
