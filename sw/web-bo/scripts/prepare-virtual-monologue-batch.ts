/**
 * 가상 독백 작업 배치의 빈 골격을 만든다.
 *
 * DB는 읽기만 하며, 현재 독백과 SHA-256을 배치에 고정한다.
 * route는 unreviewed, status는 draft로 시작한다. 리서치 없이 자동 분류하지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/prepare-virtual-monologue-batch.ts \
 *     --batch-id VM-P1 \
 *     --slugs peter-thiel,alex-karp \
 *     --out ../../docs/celeb-data/virtual-monologue/2026-07-29-VM-P1.json \
 *     --audit ../../docs/celeb-data/virtual-monologue/2026-07-29-structural-audit.json
 *
 * 기존 파일은 --force 없이는 덮어쓰지 않는다.
 */

import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'

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

function requiredArg(flag: string): string {
  const index = process.argv.indexOf(flag)
  const value = index >= 0 ? process.argv[index + 1] : null
  if (!value) throw new Error(`${flag} 값이 필요하다.`)
  return value
}

function optionalArg(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const BATCH_ID = requiredArg('--batch-id')
const REQUESTED_SLUGS = requiredArg('--slugs').split(',').map(value => value.trim()).filter(Boolean)
const OUTPUT = resolve(process.cwd(), requiredArg('--out'))
const AUDIT_FILE = optionalArg('--audit')
  ? resolve(process.cwd(), optionalArg('--audit')!)
  : null
const FORCE = process.argv.includes('--force')

if (new Set(REQUESTED_SLUGS).size !== REQUESTED_SLUGS.length) {
  throw new Error('요청 slug에 중복이 있다.')
}
if (REQUESTED_SLUGS.length === 0 || REQUESTED_SLUGS.length > 50) {
  throw new Error(`배치 크기는 1~50명: ${REQUESTED_SLUGS.length}`)
}
if (existsSync(OUTPUT) && !FORCE) {
  throw new Error(`기존 배치 파일을 덮어쓰지 않는다: ${OUTPUT}`)
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Row = {
  id: string
  slug: string
  nickname: string
  profession: string | null
  birth_date: string | null
  death_date: string | null
  bio: string | null
  celeb_tier: string | null
  publication_status: string | null
  virtual_monologue: string | null
  celeb_influence:
    | { total_score: number | null }[]
    | { total_score: number | null }
    | null
}
type StructuralPerson = {
  slug: string
  structuralPriority?: string
  blockingSignals?: string[]
  reviewSignals?: string[]
  corpusSharedPhrases?: Array<{ phrase: string; documents: number }>
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function influenceScore(row: Row): number | null {
  const influence = Array.isArray(row.celeb_influence)
    ? row.celeb_influence[0]
    : row.celeb_influence
  return influence?.total_score ?? null
}

function targetChars(score: number | null): number {
  if (score !== null && score >= 65) return 1200
  if (score !== null && score >= 50) return 1000
  if (score !== null && score >= 35) return 850
  return 800
}

function loadStructuralAudit(): Map<string, StructuralPerson> {
  if (!AUDIT_FILE) return new Map()
  if (!existsSync(AUDIT_FILE)) throw new Error(`구조 감사 파일 없음: ${AUDIT_FILE}`)
  const parsed = JSON.parse(readFileSync(AUDIT_FILE, 'utf8')) as { people?: StructuralPerson[] }
  if (!Array.isArray(parsed.people)) throw new Error('구조 감사 파일에 people 배열이 없다.')
  return new Map(parsed.people.map(person => [person.slug, person]))
}

async function main() {
  const { data, error } = await db
    .from('celebs')
    .select('id, slug, nickname, profession, birth_date, death_date, bio, celeb_tier, publication_status, virtual_monologue, celeb_influence!celeb_influence_celebs_fkey(total_score)')
    .in('slug', REQUESTED_SLUGS)
    .eq('publication_status', 'active')
  if (error) throw error

  const bySlug = new Map(((data ?? []) as unknown as Row[]).map(row => [row.slug, row]))
  const missing = REQUESTED_SLUGS.filter(slug => !bySlug.has(slug))
  if (missing.length) throw new Error(`활성 CELEB에서 찾지 못한 slug: ${missing.join(', ')}`)

  const structural = loadStructuralAudit()
  const people = REQUESTED_SLUGS.map(slug => {
    const row = bySlug.get(slug)!
    const currentText = row.virtual_monologue?.trim() ?? ''
    const signal = structural.get(slug)
    const score = influenceScore(row)
    return {
      slug: row.slug,
      nickname: row.nickname,
      profileType: row.celeb_tier === 'fiction' ? 'fiction' : 'real',
      tier: row.celeb_tier,
      profession: row.profession,
      influenceScore: score,
      targetChars: targetChars(score),
      route: 'unreviewed',
      routeReason: '',
      currentText,
      currentHash: sha256(currentText),
      structuralAudit: signal
        ? {
            priority: signal.structuralPriority ?? null,
            blocking: signal.blockingSignals ?? [],
            review: signal.reviewSignals ?? [],
            sharedPhrases: signal.corpusSharedPhrases ?? [],
          }
        : null,
      dossier: {
        identity: {
          name: row.nickname,
          birth: row.birth_date,
          death: row.death_date,
          profession: row.profession,
          disambiguation: '',
          existingBioForDiscoveryOnly: row.bio?.trim() ?? '',
        },
        sources: [],
        turningPoints: [],
        positions: [],
        tensions: [],
        voice: {
          sentenceLength: '',
          directness: '',
          moves: [],
          avoid: [],
        },
        hardTerms: [],
        researchLimits: [],
      },
      candidateText: null,
      candidateHash: null,
      candidateGeneratedAt: null,
      candidatePromptVersion: null,
      reviews: [],
      reviewHistory: [],
      review: {
        blocking: [],
        major: [],
        minor: [],
      },
      approval: null,
      status: 'draft',
      publishedAt: null,
      liveVerifiedAt: null,
    }
  })

  const batch = {
    schemaVersion: 1,
    batchId: BATCH_ID,
    promptVersion: 'vm-ko-dossier-v1',
    model: 'gpt-5.6-sol',
    createdAt: new Date().toISOString(),
    people,
  }
  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, `${JSON.stringify(batch, null, 2)}\n`, 'utf8')
  console.log(`배치 ${BATCH_ID} · ${people.length}명 · DB 쓰기 0건`)
  console.log(`출력: ${OUTPUT}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
