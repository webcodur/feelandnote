/**
 * Speech 파이프라인 3단계 — 최소 입력을 celeb-fill 패치로 조립한다.
 *
 *   pnpm celeb:speech:3-patch .tmp-celeb-fill/in-01.json .tmp-celeb-fill/patch-01.json
 *
 * 사람이 쓰는 것은 판단이 든 값뿐이다. 스키마 뼈대, sourceUrl 배선, voiceSamples,
 * quoteOutcome, dialogueDecision, schemaVersion, 그리고 DB에서 현재 `lines` 를 읽어
 * 계산하는 SHA-256 은 이 단계가 만든다. 손으로 쓴 해시는 반드시 낡는다.
 *
 * 입력(한 명은 객체, 여러 명은 배열):
 * {
 *   "slug": "steven-bartlett",
 *   "tone": "composed",                       // celebs.speech_tone
 *   "wiki": "Steven_Bartlett_(businessman)",  // 영문 위키백과 문서 제목
 *   "identity_src": "https://...",            // 위키백과 항목이 없을 때만. wiki 대신 쓴다
 *   "identity": "한국어 신원 한 줄",
 *   "quote_ko": "...", "quote_en": "...", "quote_src": "https://...",
 *   "original": "원문 그대로", "lang": "ko",   // 원문이 영어가 아닐 때만
 *   "facts":     [["한국어 사실", "https://..."], ...],   // 2건 이상
 *   "anchors":   ["...", "...", "..."],                   // 3건 이상
 *   "queries":   ["...", "...", "..."],                   // 3건 이상
 *   "inspected": [["https://...", "본문에서 무엇을 확인했는지"], ...],  // 2건 이상
 *   "channels":  ["신문 인터뷰 기사", "백과 요약 항목"],
 *   "assessment": "판정 근거 한 문단",
 *   "lines": { "greeting": [3], "roll_call": [3], "deploy": [3],
 *              "battle_win": [3], "battle_draw": [3], "battle_lose": [3], "clash_attack": [3] }
 * }
 *
 * 직접 발언을 끝내 확보하지 못한 경우 `"unavailable": true` 와 `"unavailable_reason"` 을 넣는다.
 * 한마디는 표준 자리 표시 값으로 자동 대체되고, 룰북이 요구하는 출처 3곳·호스트 2곳을 여기서 먼저 센다.
 *
 * 전체 흐름은 docs/project/celeb/celeb-04-02-speech-pipeline.md 가 쥔다.
 */

import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  NO_VERIFIED_QUOTE_EN,
  NO_VERIFIED_QUOTE_KO,
  SPEECH_QUOTE_MAX_KO,
  SPEECH_SITUATIONS,
  speechLinesSha256,
  validateSpeechLinesKo,
} from '../../lib/celeb-speech-research'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_DB_API_URL
const key = process.env.DB_SECRET_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY 없음')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// ─────────────────────────────────────────────────────────────────────────────
// 0. 최소 입력 형태
// ─────────────────────────────────────────────────────────────────────────────

type MinimalInput = {
  slug: string
  tone: string
  wiki?: string
  identity_src?: string
  identity: string
  quote_ko?: string
  quote_en?: string
  quote_src?: string
  original?: string
  lang?: string
  facts: Array<[string, string]>
  anchors: string[]
  queries: string[]
  inspected: Array<[string, string]>
  channels?: string[]
  assessment: string
  lines: Record<string, string[]>
  celeb?: Record<string, unknown>
  unavailable?: boolean
  unavailable_reason?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 현재값 조회 — 해시는 언제나 DB에서 다시 계산한다
// ─────────────────────────────────────────────────────────────────────────────

async function currentLines(slug: string): Promise<Record<string, unknown>> {
  const { data: celeb, error: celebError } = await db.from('celebs').select('id').eq('slug', slug).maybeSingle()
  if (celebError) throw new Error(`${slug} 조회 실패: ${celebError.message}`)
  if (!celeb) throw new Error(`${slug} 없음`)

  const { data: dialogue, error: dialogueError } = await db
    .from('celeb_dialogues').select('lines').eq('celeb_id', celeb.id).maybeSingle()
  if (dialogueError) throw new Error(`${slug} 대사 조회 실패: ${dialogueError.message}`)
  return (dialogue?.lines as Record<string, unknown> | null) ?? {}
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 입력 검사 — dry-run 왕복을 아끼려고 여기서 먼저 거른다
// ─────────────────────────────────────────────────────────────────────────────

function hostOf(value: string): string {
  return new URL(value).hostname.toLowerCase()
}

function check(input: MinimalInput): void {
  const fail = (message: string) => { throw new Error(`${input.slug}: ${message}`) }

  if (input.unavailable) {
    if (!input.unavailable_reason) fail('unavailable 에는 unavailable_reason 이 필요하다')
    if (input.inspected.length < 3) fail('unavailable 은 실제로 연 출처 3곳 이상이 필요하다')
    const hosts = new Set(input.inspected.map(([source]) => hostOf(source)))
    if (hosts.size < 2) fail(`unavailable 은 서로 다른 호스트 2곳 이상이 필요하다 (현재 ${hosts.size})`)
  } else {
    for (const field of ['quote_ko', 'quote_en', 'quote_src'] as const) {
      if (!input[field]) fail(`입력 누락: ${field}`)
    }
  }

  for (const field of ['slug', 'tone', 'identity', 'assessment'] as const) {
    if (!input[field]) fail(`입력 누락: ${field}`)
  }
  if (!input.wiki && !input.identity_src) fail('wiki 또는 identity_src 중 하나가 필요하다')

  const quoteKo = input.quote_ko ?? NO_VERIFIED_QUOTE_KO
  if (quoteKo.length > SPEECH_QUOTE_MAX_KO) {
    fail(`한국어 한마디 ${quoteKo.length}자 (상한 ${SPEECH_QUOTE_MAX_KO})`)
  }
  if (input.facts.length < 2) fail('facts 는 2건 이상이어야 한다')
  if (input.anchors.length < 3) fail('anchors 는 3건 이상이어야 한다')
  if (input.queries.length < 3) fail('queries 는 3건 이상이어야 한다')
  if (input.inspected.length < 2) fail('inspected 는 2건 이상이어야 한다')

  const violations = validateSpeechLinesKo(input.lines)
  if (violations.length > 0) fail(`대사 게이트 실패\n  ${violations.join('\n  ')}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 조립
// ─────────────────────────────────────────────────────────────────────────────

async function build(input: MinimalInput) {
  check(input)

  const unavailable = Boolean(input.unavailable)
  const quoteKo = unavailable ? NO_VERIFIED_QUOTE_KO : input.quote_ko!
  const quoteEn = unavailable ? NO_VERIFIED_QUOTE_EN : input.quote_en!
  const identitySource = input.identity_src
    ?? `https://en.wikipedia.org/api/rest_v1/page/summary/${input.wiki}`
  const language = (input.lang ?? 'en').toLowerCase()

  const lines: Record<string, unknown> = { quote: quoteKo }
  for (const situation of SPEECH_SITUATIONS) lines[situation] = input.lines[situation]

  return {
    slug: input.slug,
    celeb: { speech_tone: input.tone, ...input.celeb },
    dialogues: { lines, lines_en: { quote: quoteEn } },
    speech_research: {
      schemaVersion: 1 as const,
      identity: { summary: input.identity, sourceUrl: identitySource },
      representativeFacts: input.facts.map(([fact, sourceUrl]) => ({ fact, sourceUrl })),
      // 원문이 한국어면 original 은 quoteKo 와 글자 그대로 같아야 한다(적용기가 대조한다).
      voiceSamples: unavailable ? [] : [{
        original: input.original ?? (language === 'ko' ? quoteKo : quoteEn),
        originalLanguage: language,
        quoteKo,
        quoteEn,
        sourceUrl: input.quote_src!,
      }],
      dialogueAnchors: input.anchors,
      searchedChannels: input.channels ?? ['기사 본문', '백과 요약 항목'],
      searchQueries: input.queries,
      inspectedSources: input.inspected.map(([sourceUrl, finding]) => ({ sourceUrl, finding })),
      quoteOutcome: unavailable ? ('unavailable' as const) : ('verified' as const),
      ...(unavailable ? { unavailableReason: input.unavailable_reason } : {}),
      dialogueDecision: 'CREATE' as const,
      dialogueAssessment: input.assessment,
      expectedLinesSha256: speechLinesSha256(await currentLines(input.slug)),
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 진입점
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [inputPath, outputPath] = process.argv.slice(2)
  if (!inputPath || !outputPath) throw new Error('사용법: 3-build-patch.ts <입력.json> <출력.json>')

  const parsed = JSON.parse(await readFile(inputPath, 'utf8')) as MinimalInput | MinimalInput[]
  const inputs = Array.isArray(parsed) ? parsed : [parsed]
  const patch = []
  for (const input of inputs) patch.push(await build(input))

  const target = path.resolve(outputPath)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, `${JSON.stringify(patch, null, 1)}\n`, 'utf8')

  console.log(`OK ${patch.length}명 | ${patch.map((person) => person.slug).join(',')}`)
  for (const person of patch) {
    const hash = person.speech_research.expectedLinesSha256.slice(0, 16)
    console.log(`   hash ${hash} | quote ${String(person.dialogues.lines.quote).length}자`)
  }
  console.log(`   → ${target}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
