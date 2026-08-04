/**
 * 가상 독백 전수 정비의 다음 한국어 배치 후보를 읽기 전용으로 고른다.
 *
 * 구조 감사의 blocking → high → medium → low, 같은 등급에서는 영향력 점수
 * 내림차순으로 정렬한다. 배치 디렉토리의 기존 `people[].slug`는 모두 제외한다.
 * DB와 파일에는 쓰지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/plan-virtual-monologue-next-batch.ts \
 *     --audit ../../docs/celeb-data/virtual-monologue/2026-07-29-structural-audit.json \
 *     --batches-dir ../../docs/celeb-data/virtual-monologue \
 *     --limit 25
 */

import { existsSync, readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

type Priority = 'blocking' | 'high' | 'medium' | 'low'

type AuditPerson = {
  slug: string
  nickname: string
  tier: string
  profession: string | null
  influenceScore: number | null
  structuralPriority: Priority
  blockingSignals: string[]
  reviewSignals: string[]
  chars: number
}

type AuditFile = {
  people: AuditPerson[]
}

type BatchLike = {
  batchId?: string
  people?: Array<{ slug?: string }>
}

function requiredArg(flag: string): string {
  const index = process.argv.indexOf(flag)
  const value = index >= 0 ? process.argv[index + 1] : null
  if (!value) throw new Error(`${flag} 값이 필요하다.`)
  return value
}

function positiveIntArg(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag)
  if (index < 0) return fallback
  const raw = process.argv[index + 1]
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1 || value > 50) {
    throw new Error(`${flag}는 1~50 정수여야 한다: ${raw}`)
  }
  return value
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

function batchedSlugs(directory: string): Set<string> {
  if (!existsSync(directory)) throw new Error(`배치 디렉토리 없음: ${directory}`)
  const slugs = new Set<string>()

  for (const name of readdirSync(directory)) {
    if (!name.endsWith('.json')) continue
    const file = resolve(directory, name)
    let parsed: BatchLike
    try {
      parsed = readJson<BatchLike>(file)
    } catch {
      continue
    }
    if (!parsed.batchId || !Array.isArray(parsed.people)) continue
    for (const person of parsed.people) {
      if (person.slug?.trim()) slugs.add(person.slug.trim())
    }
  }
  return slugs
}

const PRIORITY_ORDER: Record<Priority, number> = {
  blocking: 0,
  high: 1,
  medium: 2,
  low: 3,
}

async function main() {
  const auditFile = resolve(process.cwd(), requiredArg('--audit'))
  const batchesDir = resolve(process.cwd(), requiredArg('--batches-dir'))
  const limit = positiveIntArg('--limit', 25)
  const includeFiction = process.argv.includes('--include-fiction')

  const audit = readJson<AuditFile>(auditFile)
  if (!Array.isArray(audit.people)) throw new Error('구조 감사 파일에 people 배열이 없다.')
  const excluded = batchedSlugs(batchesDir)

  const candidates = audit.people
    .filter(person => !excluded.has(person.slug))
    .filter(person => includeFiction || person.tier !== 'fiction')
    .sort((left, right) => (
      PRIORITY_ORDER[left.structuralPriority] - PRIORITY_ORDER[right.structuralPriority]
      || (right.influenceScore ?? -1) - (left.influenceScore ?? -1)
      || left.slug.localeCompare(right.slug)
    ))
    .slice(0, limit)

  if (!candidates.length) {
    console.log('다음 배치 후보 없음')
    return
  }

  for (const [index, person] of candidates.entries()) {
    console.log([
      String(index + 1).padStart(2, '0'),
      person.structuralPriority,
      person.influenceScore ?? '-',
      person.tier,
      person.profession ?? '-',
      person.slug,
      person.nickname,
      `${person.chars}자`,
      [...person.blockingSignals, ...person.reviewSignals].join(' | ') || '-',
    ].join('\t'))
  }
  console.log(`\n--slugs ${candidates.map(person => person.slug).join(',')}`)
  console.log(`기존 배치 제외 ${excluded.size}명 · 제안 ${candidates.length}명 · DB/파일 쓰기 0건`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
