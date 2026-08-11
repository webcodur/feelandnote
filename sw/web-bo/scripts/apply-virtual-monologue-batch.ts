/**
 * 승인된 가상 독백 배치를 조건부로 게시한다.
 *
 * 기본은 dry-run이다. --apply를 붙여야 DB를 갱신한다.
 * 생성·검토와 게시를 분리하기 위해 이 스크립트는 후보를 만들거나 고치지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/apply-virtual-monologue-batch.ts --file ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json
 *   pnpm exec tsx scripts/apply-virtual-monologue-batch.ts --file <batch.json> --apply
 *   pnpm exec tsx scripts/apply-virtual-monologue-batch.ts --file <batch.json> --apply --slugs peter-thiel
 *
 * --apply 성공 뒤 celebs 캐시를 한 번만 무효화한다.
 * 로컬에서 캐시 호출을 생략하려면 --skip-revalidate를 명시한다.
 */

import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { CACHE_TAGS, domainRevalidationTags } from '@feelandnote/shared/constants/cache-tags'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const FILE_ARG = argValue('--file')
if (!FILE_ARG) throw new Error('--file <batch.json>이 필요하다.')
const FILE = resolve(process.cwd(), FILE_ARG)
const APPLY = process.argv.includes('--apply')
const SKIP_REVALIDATE = process.argv.includes('--skip-revalidate')
const SLUGS = (() => {
  const raw = argValue('--slugs')
  return raw ? new Set(raw.split(',').map(value => value.trim()).filter(Boolean)) : null
})()

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Route = 'unreviewed' | 'keep' | 'improve' | 'new' | 'hold'
type Status = 'draft' | 'reviewed' | 'approved' | 'rejected' | 'hold' | 'published'
type Review = {
  blocking: string[]
  major: string[]
  minor: string[]
}
type Person = {
  slug: string
  nickname: string
  profileType: 'real' | 'fiction'
  route: Route
  routeReason: string
  currentText: string
  currentHash: string
  dossier: unknown
  candidateText: string | null
  candidateHash: string | null
  reviews?: Array<{
    lens: 'evidence' | 'editorial'
    verdict: 'pass' | 'revise' | 'hold'
    blocking: unknown[]
    major: unknown[]
    minor: unknown[]
  }>
  review: Review
  approval?: {
    approvedAt: string
    approvedBy: string
    decisionNote: string
  } | null
  status: Status
  publishedAt?: string | null
}
type Batch = {
  schemaVersion: number
  batchId: string
  promptVersion: string
  model: string
  createdAt: string
  people: Person[]
}
type ProfileRow = {
  id: string
  slug: string
  nickname: string
  publication_status: string | null
  virtual_monologue: string | null
}
type Result = {
  slug: string
  nickname: string
  action: 'PLAN' | 'UPDATE' | 'SKIP' | 'FAIL'
  reason: string
  beforeHash?: string
  afterHash?: string
}

const HANZI = /[一-鿿]/
const URL = /https?:\/\/|www\./i
const MARKDOWN_LINK = /\[[^\]]+\]\([^)]+\)/
const LEAKED_INSTRUCTION = /(?:독백 본문만|요청하신 독백|다음은 .*독백|초안을 작성|수정한 독백|Here is the monologue)/i
const FIRST_PERSON = /(?:저는|제가|저의|나는|내가|나의|제(?=\s))/

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function parseBatch(): Batch {
  if (!existsSync(FILE)) throw new Error(`배치 파일 없음: ${FILE}`)
  const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<Batch>
  if (parsed.schemaVersion !== 1) throw new Error(`지원하지 않는 schemaVersion: ${parsed.schemaVersion}`)
  if (!parsed.batchId || !parsed.promptVersion || !parsed.model || !parsed.createdAt) {
    throw new Error('batchId, promptVersion, model, createdAt이 필요하다.')
  }
  if (!Array.isArray(parsed.people)) throw new Error('people 배열이 필요하다.')
  const duplicateSlugs = parsed.people
    .map(person => person.slug)
    .filter((slug, index, all) => all.indexOf(slug) !== index)
  if (duplicateSlugs.length) throw new Error(`중복 slug: ${[...new Set(duplicateSlugs)].join(', ')}`)
  return parsed as Batch
}

function validateApprovedPerson(person: Person): string[] {
  const errors: string[] = []
  const candidate = person.candidateText?.trim() ?? ''
  if (person.status !== 'approved' && person.status !== 'published') {
    errors.push(`status=${person.status}`)
  }
  if (person.profileType !== 'real') errors.push(`profileType=${person.profileType} — 실존 인물 게시기로 fiction 처리 금지`)
  if (person.route !== 'improve' && person.route !== 'new') errors.push(`route=${person.route}`)
  if (!person.routeReason?.trim()) errors.push('routeReason 없음')
  if (sha256(person.currentText ?? '') !== person.currentHash) errors.push('배치 currentText/currentHash 불일치')
  if (!candidate) errors.push('candidateText 없음')
  if (!person.candidateHash || sha256(candidate) !== person.candidateHash) errors.push('candidateText/candidateHash 불일치')
  if (!person.review || !Array.isArray(person.review.blocking) || !Array.isArray(person.review.major) || !Array.isArray(person.review.minor)) {
    errors.push('review 구조 불완전')
  } else {
    if (person.review.blocking.length) errors.push(`blocking ${person.review.blocking.length}건`)
    if (person.review.major.length) errors.push(`major ${person.review.major.length}건`)
  }
  const evidenceReview = person.reviews?.find(review => review.lens === 'evidence')
  const editorialReview = person.reviews?.find(review => review.lens === 'editorial')
  for (const [label, review] of [
    ['evidence', evidenceReview],
    ['editorial', editorialReview],
  ] as const) {
    if (!review) errors.push(`${label} 독립 검토 없음`)
    else {
      if (review.verdict !== 'pass') errors.push(`${label} verdict=${review.verdict}`)
      if (review.blocking.length) errors.push(`${label} blocking ${review.blocking.length}건`)
      if (review.major.length) errors.push(`${label} major ${review.major.length}건`)
    }
  }
  if (
    !person.approval?.approvedAt?.trim()
    || !person.approval.approvedBy?.trim()
    || !person.approval.decisionNote?.trim()
  ) {
    errors.push('명시적 승인 기록 없음')
  }
  if (candidate && HANZI.test(candidate)) errors.push('한자 혼입')
  if (candidate.includes('—')) errors.push('em dash 혼입')
  if (URL.test(candidate)) errors.push('URL 혼입')
  if (MARKDOWN_LINK.test(candidate)) errors.push('Markdown 링크 혼입')
  if (LEAKED_INSTRUCTION.test(candidate)) errors.push('작업 지시·응답 문구 누출')
  if (candidate && !FIRST_PERSON.test(candidate)) errors.push('1인칭 자기 지칭 없음')
  if (candidate === person.currentText.trim()) errors.push('후보와 현재 본문 동일')
  return errors
}

async function loadProfiles(slugs: string[]): Promise<Map<string, ProfileRow>> {
  if (!slugs.length) return new Map()
  const { data, error } = await db
    .from('celebs')
    .select('id, slug, nickname, publication_status, virtual_monologue')
    .in('slug', slugs)
  if (error) throw error
  return new Map(((data ?? []) as unknown as ProfileRow[]).map(row => [row.slug, row]))
}

async function revalidateCelebs(): Promise<string> {
  if (SKIP_REVALIDATE) return '명시적으로 생략'
  const secret = process.env.CRON_SECRET
  if (!secret) throw new Error('CRON_SECRET 없음. --skip-revalidate 없이 게시할 수 없다.')
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'
  const response = await fetch(`${webUrl}/api/revalidate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag: domainRevalidationTags(CACHE_TAGS.CELEBS), secret }),
  })
  if (!response.ok) {
    throw new Error(`celebs 캐시 무효화 실패: HTTP ${response.status} ${await response.text()}`)
  }
  return `HTTP ${response.status}`
}

async function main() {
  const batch = parseBatch()
  let people = batch.people
  if (SLUGS) {
    people = people.filter(person => SLUGS.has(person.slug))
    const found = new Set(people.map(person => person.slug))
    const missing = [...SLUGS].filter(slug => !found.has(slug))
    if (missing.length) throw new Error(`배치에서 못 찾은 slug: ${missing.join(', ')}`)
  }

  const profiles = await loadProfiles(people.map(person => person.slug))
  const results: Result[] = []
  let changed = 0
  let batchChanged = false

  for (const person of people) {
    if (
      (person.status !== 'approved' && person.status !== 'published')
      || person.route === 'keep'
      || person.route === 'hold'
    ) {
      results.push({
        slug: person.slug,
        nickname: person.nickname,
        action: 'SKIP',
        reason: person.status !== 'approved' ? `미승인(${person.status})` : `게시하지 않는 route=${person.route}`,
      })
      continue
    }

    const errors = validateApprovedPerson(person)
    const profile = profiles.get(person.slug)
    if (!profile) errors.push('DB에서 slug를 찾지 못함')
    else {
      if (profile.publication_status !== 'active') {
        errors.push(`DB publication_status=${profile.publication_status}`)
      }
      if (profile.nickname !== person.nickname) errors.push(`동명이인 가드: DB nickname=${profile.nickname}`)
    }

    if (errors.length) {
      results.push({ slug: person.slug, nickname: person.nickname, action: 'FAIL', reason: errors.join(' | ') })
      continue
    }

    const candidate = person.candidateText!.trim()
    const dbText = profile!.virtual_monologue?.trim() ?? ''
    const dbHash = sha256(dbText)
    if (dbHash === person.candidateHash) {
      if (person.status === 'approved') {
        person.status = 'published'
        person.publishedAt = new Date().toISOString()
        batchChanged = true
      }
      results.push({
        slug: person.slug,
        nickname: person.nickname,
        action: 'SKIP',
        reason: '이미 후보와 일치',
        beforeHash: dbHash,
        afterHash: dbHash,
      })
      continue
    }
    if (dbHash !== person.currentHash) {
      results.push({
        slug: person.slug,
        nickname: person.nickname,
        action: 'FAIL',
        reason: '원문 drift — 배치 작성 뒤 DB 본문이 달라짐',
        beforeHash: dbHash,
        afterHash: person.candidateHash!,
      })
      continue
    }

    if (!APPLY) {
      results.push({
        slug: person.slug,
        nickname: person.nickname,
        action: 'PLAN',
        reason: `${person.route} 후보 게시 예정`,
        beforeHash: dbHash,
        afterHash: person.candidateHash!,
      })
      continue
    }

    const { data, error } = await db.rpc('apply_virtual_monologue_candidate', {
      p_slug: person.slug,
      p_expected_text: person.currentText,
      p_candidate_text: candidate,
    })
    if (error) {
      results.push({ slug: person.slug, nickname: person.nickname, action: 'FAIL', reason: error.message })
      continue
    }
    const rpcRow = (Array.isArray(data) ? data[0] : data) as {
      applied?: boolean
      current_text?: string | null
    } | null
    if (!rpcRow?.applied) {
      results.push({
        slug: person.slug,
        nickname: person.nickname,
        action: 'FAIL',
        reason: '동시 수정 감지 — DB 원문이 배치 currentText와 불일치',
        beforeHash: sha256(rpcRow?.current_text?.trim() ?? ''),
      })
      continue
    }
    const savedHash = sha256(rpcRow.current_text?.trim() ?? '')
    if (savedHash !== person.candidateHash) {
      results.push({
        slug: person.slug,
        nickname: person.nickname,
        action: 'FAIL',
        reason: '저장 후 해시 불일치',
        afterHash: savedHash,
      })
      continue
    }
    changed++
    person.status = 'published'
    person.publishedAt = new Date().toISOString()
    batchChanged = true
    results.push({
      slug: person.slug,
      nickname: person.nickname,
      action: 'UPDATE',
      reason: `${person.route} 후보 게시`,
      beforeHash: dbHash,
      afterHash: savedHash,
    })
  }

  let revalidate: string | null = null
  let revalidateError: string | null = null
  if (APPLY && changed > 0) {
    try {
      revalidate = await revalidateCelebs()
    } catch (error) {
      revalidateError = (error as Error).message
    }
  }

  const counts = Object.fromEntries(
    ['PLAN', 'UPDATE', 'SKIP', 'FAIL'].map(action => [
      action,
      results.filter(result => result.action === action).length,
    ]),
  )
  const report = {
    schemaVersion: 1,
    batchId: batch.batchId,
    batchFile: FILE,
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    counts,
    revalidate,
    revalidateError,
    results,
  }
  const reportFile = FILE.replace(/\.json$/i, '.apply-report.json')
  const historyFile = FILE.replace(/\.json$/i, '.apply-history.jsonl')
  const historyKeys = new Set<string>()
  if (existsSync(historyFile)) {
    for (const line of readFileSync(historyFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
      try {
        const item = JSON.parse(line) as { generatedAt?: string; mode?: string }
        historyKeys.add(`${item.generatedAt ?? ''}|${item.mode ?? ''}`)
      } catch {
        throw new Error(`손상된 게시 이력 JSONL: ${historyFile}`)
      }
    }
  }
  if (existsSync(reportFile)) {
    const previous = JSON.parse(readFileSync(reportFile, 'utf8')) as {
      generatedAt?: string
      mode?: string
    }
    const previousKey = `${previous.generatedAt ?? ''}|${previous.mode ?? ''}`
    if (!historyKeys.has(previousKey)) {
      appendFileSync(historyFile, `${JSON.stringify(previous)}\n`, 'utf8')
      historyKeys.add(previousKey)
    }
  }
  const reportKey = `${report.generatedAt}|${report.mode}`
  if (!historyKeys.has(reportKey)) {
    appendFileSync(historyFile, `${JSON.stringify(report)}\n`, 'utf8')
  }
  if (batchChanged) {
    writeFileSync(FILE, `${JSON.stringify(batch, null, 2)}\n`, 'utf8')
  }
  writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

  console.log(JSON.stringify({ batchId: batch.batchId, mode: report.mode, counts, revalidate, revalidateError }, null, 2))
  for (const result of results) console.log(`${result.action}\t${result.slug}\t${result.reason}`)
  console.log(`보고서: ${reportFile}`)

  if (counts.FAIL > 0 || revalidateError) process.exitCode = 1
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
