/**
 * profiles.virtual_monologue 전수 구조 감사기.
 *
 * 이 스크립트는 DB를 읽기만 한다. 길이·정규식·반복 구절은 조사 우선순위를 잡는
 * 신호일 뿐, 유지/개선/신규/보류를 자동 판정하지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/audit-virtual-monologues.ts
 *   pnpm exec tsx scripts/audit-virtual-monologues.ts --out ../../docs/celeb-data/virtual-monologue/2026-07-29-structural-audit.json
 *   pnpm exec tsx scripts/audit-virtual-monologues.ts --slugs peter-thiel,alex-karp
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

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const OUTPUT = resolve(
  process.cwd(),
  argValue('--out') ?? '.tmp/virtual-monologue-structural-audit.json',
)
const SLUGS = (() => {
  const raw = argValue('--slugs')
  return raw ? new Set(raw.split(',').map(value => value.trim()).filter(Boolean)) : null
})()

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type Influence = { total_score: number | null }
type ProfileRow = {
  id: string
  slug: string
  nickname: string
  profession: string | null
  birth_date: string | null
  death_date: string | null
  bio: string | null
  status: string | null
  celeb_tier: string | null
  virtual_monologue: string | null
  celeb_influence: Influence[] | Influence | null
}

type Priority = 'blocking' | 'high' | 'medium' | 'low'

const PAGE_SIZE = 1000
const HANZI = /[一-鿿]/
const URL = /https?:\/\/|www\./i
const MARKDOWN_LINK = /\[[^\]]+\]\([^)]+\)/
const LEAKED_INSTRUCTION = /(?:독백 본문만|요청하신 독백|다음은 .*독백|초안을 작성|수정한 독백|Here is the monologue)/i
const INNER_STATE_PATTERNS: Array<[string, RegExp]> = [
  ['깨달음', /깨달았|깨닫게 되었/],
  ['견딜 수 없음', /견딜 수 없|참을 수 없/],
  ['답을 찾지 못함', /답을 찾지 못|답하지 못|답을 갖고 있지 않/],
  ['내면의 결심', /마음먹었|결심했|다짐했/],
  ['두려움·고통', /두려웠|고통스러웠|피가 말랐/],
  ['후회', /후회했|후회합니다|후회한다/],
]
const GENERIC_OPENERS: Array<[string, RegExp]> = [
  ['사람들은', /^사람들은/],
  ['세상은', /^세상은/],
  ['역사는', /^역사는/],
  ['누군가는', /^누군가는/],
  ['저는 이름입니다', /^저는\s+[^.!?\n]{1,30}(?:입니다|라고 합니다)[.!?]?/],
  ['나는 이름이다', /^나는\s+[^.!?\n]{1,30}(?:이다|라고 한다)[.!?]?/],
]
const GENERIC_CLOSERS: Array<[string, RegExp]> = [
  ['앞으로도', /앞으로도[^.!?]{0,100}[.!?]?$/],
  ['끝까지', /끝까지[^.!?]{0,100}[.!?]?$/],
  ['남기고 싶다', /남기고 싶(?:습니다|다)[.!?]?$/],
  ['믿는다', /믿(?:습니다|는다)[.!?]?$/],
  ['바란다', /바랍(?:니다|니까)|바란다[.!?]?$/],
  ['기억되다', /기억(?:될|되길|되고 싶)[^.!?]{0,60}[.!?]?$/],
]
const HARD_TERMS = [
  '모방 욕망', '제로섬', '독점', '패러다임', '실존주의', '허무주의', '변증법',
  '상대성 이론', '양자역학', '자연 선택', '블록체인', '탈중앙화', '억지력',
  '시민적 자유', '알고리즘', '데이터 플랫폼', '클라우드', '창조적 파괴',
  '공리주의', '자유지상주의', '현상학', '구조주의', '해체주의',
]

function scoreOf(row: ProfileRow): number | null {
  const influence = Array.isArray(row.celeb_influence)
    ? row.celeb_influence[0]
    : row.celeb_influence
  return influence?.total_score ?? null
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function compact(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function paragraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean)
}

function sentences(text: string): string[] {
  return compact(text)
    .split(/(?<=[.!?…])\s+/)
    .map(value => value.trim())
    .filter(Boolean)
}

function targetLabel(score: number | null): string {
  if (score !== null && score >= 65) return '1200자 내외'
  if (score !== null && score >= 50) return '1000자 내외'
  if (score !== null && score >= 35) return '850자 내외'
  return '800자 내외'
}

function reviewFloor(score: number | null): number {
  if (score !== null && score >= 65) return 900
  if (score !== null && score >= 50) return 750
  if (score !== null && score >= 35) return 650
  return 550
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function termIsGuided(text: string, term: string): boolean {
  const escaped = escapeRegExp(term)
  return new RegExp(`${escaped}\\s*\\([^)]{2,80}\\)`).test(text)
    || new RegExp(`\\([^)]{2,80}${escaped}[^)]{0,40}\\)`).test(text)
}

function ngrams(text: string, nickname: string, size = 5): Set<string> {
  const withoutName = compact(text)
    .replaceAll(nickname, '<인물>')
    .replace(/[“”"'‘’()[\]{}.,!?…:;·/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = withoutName.split(' ').filter(Boolean)
  const found = new Set<string>()
  for (let index = 0; index <= words.length - size; index++) {
    const phrase = words.slice(index, index + size).join(' ')
    if (phrase.length >= 14) found.add(phrase)
  }
  return found
}

async function loadAll(): Promise<ProfileRow[]> {
  const rows: ProfileRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from('profiles')
      .select('id, slug, nickname, profession, birth_date, death_date, bio, status, celeb_tier, virtual_monologue, celeb_influence(total_score)')
      .eq('profile_type', 'CELEB')
      .eq('status', 'active')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const page = (data ?? []) as unknown as ProfileRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

function countBy<T extends string>(values: T[]): Record<T, number> {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {} as Record<T, number>)
}

async function main() {
  const all = await loadAll()
  const selected = SLUGS ? all.filter(row => SLUGS.has(row.slug)) : all
  if (SLUGS) {
    const found = new Set(selected.map(row => row.slug))
    const missing = [...SLUGS].filter(slug => !found.has(slug))
    if (missing.length) throw new Error(`활성 CELEB에서 못 찾은 slug: ${missing.join(', ')}`)
  }

  const docFrequency = new Map<string, Set<string>>()
  for (const row of selected) {
    const text = row.virtual_monologue?.trim() ?? ''
    if (!text) continue
    for (const phrase of ngrams(text, row.nickname)) {
      const slugs = docFrequency.get(phrase) ?? new Set<string>()
      slugs.add(row.slug)
      docFrequency.set(phrase, slugs)
    }
  }

  const sharedPhrases = [...docFrequency.entries()]
    .filter(([, slugs]) => slugs.size >= 3)
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], 'ko'))
    .map(([phrase, slugs]) => ({ phrase, documents: slugs.size, slugs: [...slugs].sort() }))

  const people = selected.map(row => {
    const text = row.virtual_monologue?.trim() ?? ''
    const score = scoreOf(row)
    const para = paragraphs(text)
    const sent = sentences(text)
    const first = sent[0] ?? ''
    const last = sent.at(-1) ?? ''
    const parentheticalGuides = [...text.matchAll(/\(([^)\n]{2,80})\)/g)].map(match => match[1].trim())
    const innerStateSignals = INNER_STATE_PATTERNS
      .filter(([, pattern]) => pattern.test(text))
      .map(([label]) => label)
    const genericOpeningSignals = GENERIC_OPENERS
      .filter(([, pattern]) => pattern.test(first))
      .map(([label]) => label)
    const genericClosingSignals = GENERIC_CLOSERS
      .filter(([, pattern]) => pattern.test(last))
      .map(([label]) => label)
    const hardTermsUsed = HARD_TERMS
      .filter(term => text.includes(term))
      .map(term => ({ term, guided: termIsGuided(text, term) }))
    const repeatedPhrases = ngrams(text, row.nickname)
    const corpusShared = [...repeatedPhrases]
      .map(phrase => ({ phrase, documents: docFrequency.get(phrase)?.size ?? 0 }))
      .filter(item => item.documents >= 3)
      .sort((a, b) => b.documents - a.documents || a.phrase.localeCompare(b.phrase, 'ko'))
      .slice(0, 8)

    const blockingSignals = [
      !text ? '독백 없음' : null,
      HANZI.test(text) ? '한자 혼입' : null,
      /—/.test(text) ? 'em dash 혼입' : null,
      URL.test(text) ? 'URL 혼입' : null,
      MARKDOWN_LINK.test(text) ? 'Markdown 링크 혼입' : null,
      LEAKED_INSTRUCTION.test(text) ? '작업 지시·응답 문구 누출' : null,
    ].filter((value): value is string => Boolean(value))

    const reviewSignals = [
      text && text.length < reviewFloor(score) ? `분량 검토 신호(${text.length}자/${targetLabel(score)})` : null,
      text && para.length === 1 ? '단일 문단' : null,
      first.includes(row.nickname) ? '첫 문장 이름 노출' : null,
      ...genericOpeningSignals.map(value => `상투 도입:${value}`),
      ...genericClosingSignals.map(value => `상투 결말:${value}`),
      ...innerStateSignals.map(value => `근거 확인할 내면:${value}`),
      ...hardTermsUsed.filter(item => !item.guided).map(item => `설명 확인할 용어:${item.term}`),
      corpusShared.length ? `전 인물 공유 5-gram ${corpusShared.length}개` : null,
    ].filter((value): value is string => Boolean(value))

    let priority: Priority = 'low'
    if (blockingSignals.length) priority = 'blocking'
    else if (reviewSignals.length >= 4) priority = 'high'
    else if (reviewSignals.length >= 1) priority = 'medium'

    return {
      slug: row.slug,
      nickname: row.nickname,
      tier: row.celeb_tier,
      profession: row.profession,
      birthDate: row.birth_date,
      deathDate: row.death_date,
      influenceScore: score,
      target: targetLabel(score),
      bioChars: row.bio?.trim().length ?? 0,
      textHash: sha256(text),
      chars: text.length,
      paragraphs: para.length,
      sentences: sent.length,
      questions: (text.match(/\?/g) ?? []).length,
      quoteMarks: (text.match(/[“”"]/g) ?? []).length,
      parentheticalGuides,
      hardTermsUsed,
      firstExcerpt: compact(text).slice(0, 180),
      lastExcerpt: compact(text).slice(-180),
      blockingSignals,
      reviewSignals,
      structuralPriority: priority,
      corpusSharedPhrases: corpusShared,
    }
  })

  const priorities = people.map(person => person.structuralPriority)
  const summary = {
    activeCelebsLoaded: all.length,
    audited: people.length,
    byTier: countBy(people.map(person => person.tier ?? 'null')),
    missingMonologue: people.filter(person => person.chars === 0).length,
    under700Chars: people.filter(person => person.chars > 0 && person.chars < 700).length,
    nameInFirstSentence: people.filter(person => person.reviewSignals.includes('첫 문장 이름 노출')).length,
    singleParagraph: people.filter(person => person.reviewSignals.includes('단일 문단')).length,
    withParentheticalGuides: people.filter(person => person.parentheticalGuides.length > 0).length,
    withInnerStateSignals: people.filter(person => person.reviewSignals.some(signal => signal.startsWith('근거 확인할 내면:'))).length,
    withSharedFiveGram: people.filter(person => person.corpusSharedPhrases.length > 0).length,
    structuralPriority: countBy(priorities),
    sharedFiveGrams: sharedPhrases.length,
  }

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    warning: '구조 신호는 조사 우선순위다. 유지/개선/신규/보류의 최종 판정이 아니다.',
    scope: SLUGS ? { slugs: [...SLUGS] } : { status: 'active', profileType: 'CELEB' },
    summary,
    topSharedFiveGrams: sharedPhrases.slice(0, 100),
    people,
  }

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(summary, null, 2))
  console.log(`보고서: ${OUTPUT}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
