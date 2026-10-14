/**
 * direct-title-candidates 결과를 agy/Gemini로 사람 단위 검수한다.
 * 선택 결과만 로컬 JSON에 누적하고 DB는 건드리지 않는다. 같은 출력 파일로 재실행하면 이어서 한다.
 *
 * pnpm figure-books:review-direct -- --input ../../data/celeb/figure-books/direct-title-candidates.json --out ../../data/celeb/figure-books/direct-title-reviewed.json
 * 여러 1차 검수 결과를 합쳐 최종 심사할 때는 --shortlist를 반복한다.
 */

import fs from 'node:fs'
import path from 'node:path'
import { agyCall, AGY_TEXT_MODEL } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

// 외부 CLI(agy·codex·opencode·claude·kiro)는 사용자가 승인한 실행에서만 쓴다. 기본은 본 모델이 직접 수행한다(AGENTS.md 「데이터·외부 서비스」).
if (!process.env.ALLOW_EXTERNAL_CLI) {
  console.error('이 스크립트는 외부 CLI 모델을 호출한다. 사용자 승인 후 ALLOW_EXTERNAL_CLI=1로 실행한다.')
  process.exit(1)
}

function value(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

function values(name) {
  const results = []
  for (let index = 0; index < process.argv.length; index += 1) {
    const argument = process.argv[index]
    if (argument === `--${name}` && process.argv[index + 1]) {
      results.push(process.argv[index + 1])
      index += 1
      continue
    }
    if (argument.startsWith(`--${name}=`)) results.push(argument.slice(name.length + 3))
  }
  return results
}

function integer(name, fallback) {
  const raw = value(name)
  if (raw === null) return fallback
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${name}은 1 이상의 정수여야 합니다.`)
  return parsed
}

const inputPath = path.resolve(process.cwd(), value('input') ?? '')
const outputPath = path.resolve(process.cwd(), value('out') ?? '')
if (!value('input') || !value('out')) throw new Error('--input과 --out이 필요합니다.')
const batchPeople = integer('batch-people', 10)
const batchCandidates = integer('batch-candidates', 45)
const maximumBatches = integer('max-batches', Number.MAX_SAFE_INTEGER)
const profession = value('profession')
const includeWeak = process.argv.includes('--include-weak')
const offline = process.argv.includes('--offline')
const validateOnly = process.argv.includes('--validate-only')
const shortlistPaths = values('shortlist')
const shardRaw = value('shard')
const shard = (() => {
  if (!shardRaw) return null
  const match = shardRaw.match(/^(\d+)\/(\d+)$/)
  if (!match) throw new Error('--shard는 1/3처럼 입력합니다.')
  const index = Number(match[1])
  const count = Number(match[2])
  if (index < 1 || count < 2 || index > count) throw new Error('--shard 범위가 잘못됐습니다.')
  return { index, count }
})()

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
if (!Array.isArray(input.candidates)) throw new Error('입력에 candidates 배열이 없습니다.')
const shortlists = shortlistPaths.map((shortlistPath) => ({
  path: shortlistPath,
  document: JSON.parse(fs.readFileSync(path.resolve(process.cwd(), shortlistPath), 'utf8')),
}))
for (const shortlist of shortlists) {
  if (!Array.isArray(shortlist.document.reviews)) {
    throw new Error(`${shortlist.path}: --shortlist 파일에 reviews 배열이 없습니다.`)
  }
}
const shortlistedBySlug = new Map()
const shortlistedKeys = new Set()
for (const shortlist of shortlists) {
  for (const review of shortlist.document.reviews) {
    const byContent = shortlistedBySlug.get(review.slug) ?? new Map()
    for (const selection of review.selections ?? []) {
      const firstPasses = byContent.get(selection.contentId) ?? []
      firstPasses.push({ ...selection, source: path.basename(shortlist.path) })
      byContent.set(selection.contentId, firstPasses)
      shortlistedKeys.add(`${review.slug}\u0000${selection.contentId}`)
    }
    shortlistedBySlug.set(review.slug, byContent)
  }
}

const grouped = new Map()
const matchedShortlistKeys = new Set()
for (const candidate of input.candidates) {
  if (profession && candidate.person?.profession !== profession) continue
  const slug = candidate.person?.slug
  if (!slug) throw new Error('후보에 person.slug가 없습니다.')
  const shortlisted = shortlistedBySlug.get(slug)
  if (shortlists.length > 0 && !shortlisted?.has(candidate.book?.contentId)) continue
  if (shortlists.length > 0) matchedShortlistKeys.add(`${slug}\u0000${candidate.book.contentId}`)
  if (shortlists.length === 0 && !includeWeak && candidate.signal === 'weak') continue
  const current = grouped.get(slug) ?? { person: candidate.person, candidates: [] }
  current.candidates.push({
    ...candidate.book,
    ...(shortlisted ? { firstPasses: shortlisted.get(candidate.book.contentId) } : {}),
  })
  grouped.set(slug, current)
}
const missingShortlistKeys = [...shortlistedKeys].filter((key) => !matchedShortlistKeys.has(key))
if (missingShortlistKeys.length > 0) {
  throw new Error(`통합 후보에서 1차 선택 ${missingShortlistKeys.length}건을 찾지 못했습니다: ${missingShortlistKeys.slice(0, 5).join(', ')}`)
}

const previous = fs.existsSync(outputPath)
  ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
  : { input: path.relative(process.cwd(), inputPath), model: AGY_TEXT_MODEL, reviews: [] }
if (!Array.isArray(previous.reviews)) throw new Error('기존 출력의 reviews가 배열이 아닙니다.')
const reviewed = new Set(previous.reviews.map((review) => review.slug))
const allGroups = [...grouped.values()]
const assignedGroups = shard
  ? allGroups.filter((_, index) => index % shard.count === shard.index - 1)
  : allGroups
const pending = assignedGroups.filter((group) => !reviewed.has(group.person.slug))

function makeBatches(groups) {
  const batches = []
  let current = []
  let candidateCount = 0
  for (const group of groups) {
    if (
      current.length > 0
      && (current.length >= batchPeople || candidateCount + group.candidates.length > batchCandidates)
    ) {
      batches.push(current)
      current = []
      candidateCount = 0
    }
    current.push(group)
    candidateCount += group.candidates.length
  }
  if (current.length > 0) batches.push(current)
  return batches
}

function parseJsonArray(text) {
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  const start = unfenced.indexOf('[')
  const end = unfenced.lastIndexOf(']')
  if (start < 0 || end < start) throw new Error(`agy 응답에 JSON 배열이 없습니다: ${text.slice(0, 200)}`)
  return JSON.parse(unfenced.slice(start, end + 1))
}

function validateReviews(raw, batch) {
  if (!Array.isArray(raw)) throw new Error('agy 결과가 배열이 아닙니다.')
  const expectedBySlug = new Map(batch.map((group) => [group.person.slug, group]))
  const actualSlugs = new Set()
  const reviews = raw.map((review, index) => {
    if (!review || typeof review !== 'object' || Array.isArray(review)) {
      throw new Error(`agy 결과[${index}]가 객체가 아닙니다.`)
    }
    const slug = String(review.slug ?? '')
    const group = expectedBySlug.get(slug)
    if (!group) throw new Error(`agy가 입력에 없는 slug를 반환했습니다: ${slug}`)
    if (actualSlugs.has(slug)) throw new Error(`agy가 slug를 중복 반환했습니다: ${slug}`)
    actualSlugs.add(slug)
    if (!Array.isArray(review.selections) || review.selections.length > 4) {
      throw new Error(`${slug}: selections는 최대 4건의 배열이어야 합니다.`)
    }
    const allowedContentIds = new Set(group.candidates.map((book) => book.contentId))
    const selectedIds = new Set()
    const selections = review.selections.map((selection, selectionIndex) => {
      const contentId = String(selection?.contentId ?? '')
      if (!allowedContentIds.has(contentId)) {
        throw new Error(`${slug}.selections[${selectionIndex}]: 입력에 없는 contentId입니다.`)
      }
      if (selectedIds.has(contentId)) throw new Error(`${slug}: contentId가 중복됩니다: ${contentId}`)
      selectedIds.add(contentId)
      const relationType = String(selection?.relationType ?? '')
      if (relationType !== 'appearance' && relationType !== 'authored') {
        throw new Error(`${slug}.${contentId}: relationType이 잘못됐습니다.`)
      }

      const description = selection?.description ?? null

      if (description !== null) {
        throw new Error(`${slug}.${contentId}: 등장이 아닌 관계의 description은 null이어야 합니다.`)
      }
      const rationale = String(selection?.rationale ?? '').trim()
      if (!rationale) throw new Error(`${slug}.${contentId}: rationale이 비었습니다.`)
      return { contentId, relationType, description: null, rationale }
    })
    return { slug, selections }
  })
  const missing = [...expectedBySlug.keys()].filter((slug) => !actualSlugs.has(slug))
  if (missing.length > 0) throw new Error(`agy가 사람을 누락했습니다: ${missing.join(', ')}`)
  return reviews
}

function promptFor(batch) {
  const payload = batch.map(({ person, candidates }) => ({ person, candidates }))
  return `한국인이 한국어로 쓴 글 답게 주의해서 작성.
인물별 후보에서 실제 등장·직접 다룸이 확인된 작품(appearance)과 본인이 집필한 작품(authored)만 최대 4권 선택한다. 본인 저서는 자서전이어도 authored다. 직군·장르·시대의 유사성이나 영향·번역·추천 관계만으로 작품을 배정하지 않는다. 본문·목차·색인·미리보기 또는 실제 집필 근거를 확인한다. 동명이인·제목 부분 문자열·일반 직군서는 제외한다. 작품·판본 범위와 읽을 가치도 확인하고 불확실하면 선택하지 않는다. 0권도 정상이다.
description은 모든 관계에서 null이다. 근거는 rationale에만 남긴다. ${offline ? '외부 도구 없이 제공된 검증 근거만 사용한다.' : '필요한 공개 출처를 실제로 열어 확인한다.'}
입력의 모든 slug를 정확히 한 번씩 JSON 배열로 반환한다: [{"slug":"입력 slug","selections":[{"contentId":"입력 contentId","relationType":"appearance 또는 authored","description":null,"rationale":"확인한 근거"}]}]
${JSON.stringify(payload)}`
}

const batches = makeBatches(pending).slice(0, maximumBatches)
console.log(JSON.stringify({
  totalPeople: grouped.size,
  assignedPeople: assignedGroups.length,
  shard: shardRaw,
  alreadyReviewed: reviewed.size,
  pending: pending.length,
  batches: batches.length,
}))
if (validateOnly) {
  console.log(`VALID shortlistSelections=${shortlistedKeys.size} groupedPeople=${grouped.size}`)
  process.exit(0)
}

for (let index = 0; index < batches.length; index += 1) {
  const batch = batches[index]
  const labels = batch.map((group) => group.person.slug)
  console.log(`[${index + 1}/${batches.length}] ${labels.join(', ')}`)
  const response = await agyCall(promptFor(batch), { model: AGY_TEXT_MODEL, timeoutMs: 900_000 })
  const reviews = validateReviews(parseJsonArray(response), batch)
  previous.reviews.push(...reviews)
  previous.updatedAt = new Date().toISOString()
  fs.writeFileSync(outputPath, `${JSON.stringify(previous, null, 2)}\n`, 'utf8')
  const selected = reviews.reduce((sum, review) => sum + review.selections.length, 0)
  console.log(`  saved people=${reviews.length} selected=${selected}`)
}

console.log(`DONE reviewed=${previous.reviews.length} selected=${previous.reviews.reduce((sum, review) => sum + review.selections.length, 0)}`)
