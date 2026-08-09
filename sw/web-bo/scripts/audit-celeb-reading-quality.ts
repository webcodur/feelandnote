/**
 * 기존 "읽어보기"에서 안내와 탐구가 직함·팀 내 역할만 되풀이하는 후보를 찾는다.
 * 길이는 단독 결함으로 쓰지 않는다. 이 스크립트는 읽기 전용이다.
 *
 * pnpm exec tsx scripts/audit-celeb-reading-quality.ts --all
 * pnpm exec tsx scripts/audit-celeb-reading-quality.ts --active --json
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  for (const filename of ['.env.local', '.env']) {
    const file = resolve(process.cwd(), filename)
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  }
}

loadEnv()

const ALL = process.argv.includes('--all')
const ACTIVE_ONLY = process.argv.includes('--active')
const JSON_OUTPUT = process.argv.includes('--json')
const SLUGS_ONLY = process.argv.includes('--slugs-only')
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const LIMIT = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : Number.POSITIVE_INFINITY

if (!ALL && !ACTIVE_ONLY) throw new Error('Specify --all or --active.')
if (!Number.isFinite(LIMIT) && limitArg) throw new Error(`Invalid --limit: ${limitArg}`)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase environment variables are required.')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type ProfileRow = {
  id: string
  slug: string
  nickname: string
  publication_status: 'active' | 'inactive' | 'suspended'
  profession: string | null
  birth_date: string | null
}

type ExplanationRow = {
  profile_id: string
  plain_text: string
  interpretive_title: string
  interpretive_text: string
}

type Candidate = {
  slug: string
  name: string
  publicationStatus: ProfileRow['publication_status']
  profession: string | null
  guideLength: number
  explorationLength: number
  score: number
  reasons: string[]
  guide: string
  explorationTitle: string
  explorationText: string
}

async function fetchAll<T>(
  table: string,
  select: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configure: (query: any) => any = (query) => query,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await configure(supabase.from(table).select(select).range(from, from + 999))
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

const ROLE_TERM = /보컬|래퍼|랩|댄서|춤|기타(?:리스트|\s*연주)?|센터|퍼포머|노래|무대|공연|멤버/g
const ROLE_EXPANSION = /두 (?:역할|목소리)|역할을 (?:함께|동시에)|양쪽에? (?:참여|관여)|폭을 넓|범위를 넓|조합|오가며|넘나들|한 멤버가|팀 안에서|팀 내|그룹 안에서|보조하는|맡는다는 것은/
const CONCRETE_ANCHOR = /[《〈「『]|\b(?:1\d{3}|20\d{2})\b|데뷔|발매|앨범|곡|싱글|드라마|영화|배역|연기|수상|후보|저술|창작|작사|작곡|제작|연출|창업|설립|선발|오디션|합류|이주|출간|전투|개혁|발견|개발|체포|판결|복귀|탈퇴|공개|기부|캠페인|협업|콘서트|투어|부상|중단/
const MODERN_PERFORMER = /가수|배우|아이돌|래퍼|음악|연예|방송|모델|댄서|성우|musician|actor|actress|entertainer|model|dancer|voice_actor/i

function uniqueMatches(text: string, expression: RegExp): string[] {
  return [...new Set(text.match(expression) ?? [])]
}

function assess(profile: ProfileRow, explanation: ExplanationRow): Candidate | null {
  const guideRoles = uniqueMatches(explanation.plain_text, ROLE_TERM)
  const explorationRoles = uniqueMatches(explanation.interpretive_text, ROLE_TERM)
  const sharedRoles = guideRoles.filter((term) => explorationRoles.includes(term))
  const lacksConcreteAnchor = !CONCRETE_ANCHOR.test(explanation.interpretive_text)
  const explicitExpansion = ROLE_EXPANSION.test(`${explanation.interpretive_title} ${explanation.interpretive_text}`)
  const shortPair = explanation.plain_text.length + explanation.interpretive_text.length < 230
  const modernPerformer = MODERN_PERFORMER.test(profile.profession ?? '')
  const reasons: string[] = []
  let score = 0

  if (modernPerformer && lacksConcreteAnchor) {
    score += 2
    reasons.push('탐구에 구체적 작품·사건 없음')
  }
  if (sharedRoles.length) {
    score += 2
    reasons.push(`두 탭 역할어 중복: ${sharedRoles.join(', ')}`)
  }
  if (explicitExpansion) {
    score += 3
    reasons.push('팀 내 역할을 의미처럼 다시 풂')
  }
  if (shortPair && (explicitExpansion || sharedRoles.length >= 2)) {
    score += 1
    reasons.push('짧은 두 글 안에서 같은 재료가 반복됨')
  }

  // 길이만 짧거나 출처만 없는 글은 후보로 올리지 않는다.
  if (!modernPerformer || score < 5 || (!explicitExpansion && sharedRoles.length < 2)) return null

  return {
    slug: profile.slug,
    name: profile.nickname,
    publicationStatus: profile.publication_status,
    profession: profile.profession,
    guideLength: explanation.plain_text.length,
    explorationLength: explanation.interpretive_text.length,
    score,
    reasons,
    guide: explanation.plain_text,
    explorationTitle: explanation.interpretive_title,
    explorationText: explanation.interpretive_text,
  }
}

async function main() {
  const [profiles, explanations] = await Promise.all([
    fetchAll<ProfileRow>('celebs', 'id,slug,nickname,publication_status,profession,birth_date', (query) =>
      query.not('slug', 'is', null).order('id')),
    fetchAll<ExplanationRow>('celeb_explanations', 'profile_id,plain_text,interpretive_title,interpretive_text', (query) => query.order('profile_id')),
  ])

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))

  const candidates = explanations
    .map((explanation) => {
      const profile = profileById.get(explanation.profile_id)
      if (!profile || (ACTIVE_ONLY && profile.publication_status !== 'active')) return null
      return assess(profile, explanation)
    })
    .filter((candidate): candidate is Candidate => Boolean(candidate))
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, LIMIT)

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), candidates }, null, 2))
    return
  }
  if (SLUGS_ONLY) {
    console.log(candidates.map((candidate) => candidate.slug).join(','))
    return
  }

  console.log(`ROLE-REPETITION CANDIDATES ${candidates.length}`)
  for (const candidate of candidates) {
    console.log(`${candidate.score}\t${candidate.publicationStatus}\t${candidate.slug}\t${candidate.name}\tguide=${candidate.guideLength}\texploration=${candidate.explorationLength}\t${candidate.reasons.join('; ')}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
