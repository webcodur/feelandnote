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
const relatedOnly = process.argv.includes('--related-only')
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
      if (relationType !== 'appearance' && relationType !== 'related') {
        throw new Error(`${slug}.${contentId}: relationType이 잘못됐습니다.`)
      }
      if (relatedOnly && relationType !== 'related') {
        throw new Error(`${slug}.${contentId}: --related-only 심사에서는 related만 허용됩니다.`)
      }
      const description = selection?.description ?? null
      if (relationType === 'appearance' && (typeof description !== 'string' || !description.trim())) {
        throw new Error(`${slug}.${contentId}: 등장 도서에는 description이 필요합니다.`)
      }
      if (relationType === 'related' && description !== null) {
        throw new Error(`${slug}.${contentId}: 연관 도서 description은 null이어야 합니다.`)
      }
      const rationale = String(selection?.rationale ?? '').trim()
      if (!rationale) throw new Error(`${slug}.${contentId}: rationale이 비었습니다.`)
      return { contentId, relationType, description: relationType === 'related' ? null : description.trim(), rationale }
    })
    return { slug, selections }
  })
  const missing = [...expectedBySlug.keys()].filter((slug) => !actualSlugs.has(slug))
  if (missing.length > 0) throw new Error(`agy가 사람을 누락했습니다: ${missing.join(', ')}`)
  return reviews
}

function promptFor(batch) {
  const payload = batch.map(({ person, candidates }) => ({
    person: {
      slug: person.slug,
      nickname: person.nickname,
      nicknameEn: person.nicknameEn,
      profession: person.profession,
      headline: person.headline,
      bio: person.bio,
    },
    candidates,
  }))
  const task = relatedOnly
    ? `아래는 인물 프로필의 구체적인 종목·장르·연구 분야·팀·사건·시대·대표 배역과 한국어 도서 메타가 맞닿은 후보들이다. 각 사람을 이해하는 데 실제로 도움이 되고, 카드의 제목과 저자만 보아도 연결이 납득되는 책만 최대 4권 고른다.

직군이 같다는 이유만으로 고르지 않는다. 선수는 실제 종목·포지션·팀, 음악인은 장르·악기, 과학자는 연구 분야, 배우·감독은 프로필에 확인되는 대표 작품이나 영화 분야처럼 그 사람의 구체적인 맥락과 책이 직접 맞아야 한다. 전기·평전·자서전처럼 인물 자체를 다루는 책은 이 단계에서 고르지 않는다. 후보 점수와 contextEvidence는 검색 단서일 뿐 정답이 아니다.`
    : shortlists.length > 0
    ? `아래는 1차 모델이 고른 인물별 책이다. 독립 편집자로 다시 심사해 실제 책장에 남길 가치가 명백한 책만 최대 4권 확정한다.

같은 작품의 판본·선집이 겹치거나 전집과 낱권이 중복되면 더 읽기 좋은 대표 선택만 남긴다. 시리즈 전권 세트가 있는데 중간 권을 함께 남기지 않는다. 서로 다른 작품·번역·선집이 실제로 다른 읽을거리를 주면 복수 선택은 가능하다. 한국어 사용자에게 보여 줄 책장이므로, 같은 가치라면 검증된 한국어판·완역·전집을 정체 불명 영문판이나 후속권보다 우선한다. 1차 판정과 rationale은 참고일 뿐 그대로 믿지 않는다.`
    : '아래는 서비스 인물 이름이 책 제목에 문자열로 걸린 후보들이다. 오탐이 많다. 각 사람에게 실제로 보여 줄 가치가 명백한 책만 최대 4권 고른다.'
  const relationRule = relatedOnly
    ? `관계는 related 하나만 쓴다. description은 반드시 null이다. related는 인물의 사상적 동의나 실제 독서를 뜻하지 않고, 그 사람의 활동 맥락을 읽는 책이라는 뜻이다.`
    : `관계는 딱 둘이다.
- appearance: 전기·평전·회고록·인터뷰집·역사서·소설 등에서 그 인물이 실질적인 중심 대상 또는 등장인물이다. 제공된 책 소개로 확인되는 사실만 써서, 사용자가 무엇으로 등장하는지 알 수 있는 자연스러운 한국어 description 한 문장을 작성한다.
- related: 그 인물이 쓴 대표 저작이거나, 인물의 팀·사건·세부 분야와 제목/저자만 봐도 연결되는 책이다. description은 반드시 null이다. 관련은 사상적 동의를 뜻하지 않는다.`
  return `${task}

${relationRule}

동명이인, 일반 단어 충돌, 책 제목 속 우연한 부분 문자열, 다른 사람의 책은 버린다. 저자 이름이 제목 괄호에 적힌 저작은 appearance가 아니라 related다. 자서전처럼 저자가 자기 생애의 대상이면 appearance다. 같은 작품의 질 낮은 판본을 여러 개 채우지 말고, 제공 메타 기준으로 읽을 가치가 높은 대표판을 우선한다. 불확실하면 고르지 않는다. 사람마다 0권도 정상이다. ${offline ? '웹 검색이나 외부 도구를 사용하지 말고 제공된 메타만으로 판단한다.' : '웹 검색은 메타만으로 판단할 수 없을 때에만 사용한다.'} 사실을 지어내지 않는다.

${relatedOnly ? '인물 자체를 다루는 책은 선택하지 않는다.' : '그 인물의 생애·사상·업적 자체를 해설하거나 연구하는 책도 인물을 중심 대상으로 다루므로 appearance다. related는 인물 자체가 아니라 그 인물의 직접 저작 또는 구체적인 활동 맥락을 읽는 책에 쓴다.'}

JSON 배열만 반환한다. 입력의 모든 slug를 정확히 한 번씩 반환한다.
[
  {
    "slug": "입력 slug",
    "selections": [
      {
        "contentId": "입력 contentId",
        "relationType": "appearance 또는 related",
        "description": "appearance 한 문장 또는 related일 때 null",
        "rationale": "선정 근거 한 문장"
      }
    ]
  }
]

입력:
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
