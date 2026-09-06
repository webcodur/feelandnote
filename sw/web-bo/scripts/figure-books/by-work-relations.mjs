/**
 * 작품 후보 조사(작품 기준) 결과를 apply-reviewed 입력으로 바꾼다. DB는 건드리지 않는다.
 * 이미 연결된 관계와 동명이인 보류 건은 제외하고, 등장 범위 설명이 있는 것만 남긴다.
 *
 * node scripts/figure-books/by-work-relations.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const inPath = resolve(process.cwd(), argumentValue('in', '../../data/celeb/figure-books/appearance-by-work-2026-09-05.jsonl'))
const candidatesOut = resolve(process.cwd(), argumentValue('candidates-out', '../../data/celeb/figure-books/by-work-apply-candidates.json'))
const reviewsOut = resolve(process.cwd(), argumentValue('reviews-out', '../../data/celeb/figure-books/by-work-apply-reviews.json'))

const rows = readFileSync(inPath, 'utf8').trim().split('\n')
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line))

const candidates = []
const bySlug = new Map()
const skipped = []

for (const row of rows) {
  for (const person of row.matched) {
    if (!person.celebId || person.reason === 'ambiguous_name') {
      skipped.push({ work: row.work.title, name: person.name, reason: person.reason ?? 'no_celeb_id' })
      continue
    }
    if (person.alreadyLinked) continue
    const scope = String(person.scope ?? '').trim()
    if (!scope) {
      skipped.push({ work: row.work.title, name: person.name, reason: 'scope_missing' })
      continue
    }

    candidates.push({
      person: { id: person.celebId, slug: person.slug },
      book: { contentId: row.work.contentId, title: row.work.title, isbn: null, verified: null },
    })

    const selections = bySlug.get(person.slug) ?? []
    if (!selections.some((selection) => selection.contentId === row.work.contentId)) {
      selections.push({
        contentId: row.work.contentId,
        relationType: 'appearance',
        description: scope,
        rationale: `작품 축 조사에서 확인한 등장 범위: ${scope}`,
      })
    }
    bySlug.set(person.slug, selections)
  }
}

const reviews = [...bySlug].map(([slug, selections]) => ({ slug, selections }))

for (const file of [candidatesOut, reviewsOut]) mkdirSync(dirname(file), { recursive: true })
writeFileSync(candidatesOut, JSON.stringify({ candidates }, null, 2), 'utf8')
writeFileSync(reviewsOut, JSON.stringify({ reviews }, null, 2), 'utf8')

const reasons = {}
for (const row of skipped) reasons[row.reason] = (reasons[row.reason] ?? 0) + 1
console.log(`작품 ${rows.length}권 → 관계 후보 ${candidates.length}건 / 인물 ${reviews.length}명 / 제외 ${skipped.length}건`)
if (skipped.length > 0) console.log('  제외 사유:', JSON.stringify(reasons))
console.log(`WROTE ${candidatesOut}`)
console.log(`WROTE ${reviewsOut}`)
