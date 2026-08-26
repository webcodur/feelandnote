/**
 * 그록 CLI로 인물 생애 연표(celeb_timeline_events)를 채우는 릴레이 관문.
 * 규칙 SSoT: docs/project/celeb/celeb-timeline-grok-relay.md, docs/project/celeb/celeb-timeline.md
 * (이 스크립트는 규칙을 복제하지 않는다. 그록에게 두 문서를 직접 읽게 한다.)
 *
 * 흐름: 조사(grok) → 의심(grok, 새 세션·출처 필수) → 수정(grok) → 한국어 편집(Codex GPT)
 * → 구조 검사 → 대기열 → 사람 승인.
 * 의심자가 실제로 연 출처(sources)를 2곳 미만으로 적으면 검색을 안 한 것으로 보고 재시도한다.
 *
 * 기본 실행은 이미 사건이 있는 인물을 건너뛴다. 기존 연표는 --replace-existing 또는
 * --audit-existing에서만 원본·지문을 stage에 보존하고 교체한다. life(실존) 티어만 지원한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/celeb/timeline/apply-grok.ts run --auto --deceased --total 35 --lanes 12 --stage
 *   pnpm exec tsx scripts/celeb/timeline/apply-grok.ts review   # 대기열을 읽고 판단
 *   pnpm exec tsx scripts/celeb/timeline/apply-grok.ts commit   # 승인분만 DB 반영
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { REPO_ROOT } from '../../lib/paths'
import { grokJson } from '../../../../../.agents/skills/grok-cli/scripts/grok-call.mjs'
import {
  reviewKoreanTimeline,
  type KoreanProseReview,
  type TimelineEventForKoreanReview,
} from './korean-prose-review'

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const RELAY_DOC = resolve(REPO_ROOT, 'docs/project/celeb/celeb-timeline-grok-relay.md')
const TIMELINE_DOC = resolve(REPO_ROOT, 'docs/project/celeb/celeb-timeline.md')

/** 의심자가 실제로 연 출처의 최소 개수. 검색을 건너뛰면 이 배열을 채울 수 없다. */
const MIN_SKEPTIC_SOURCES = 2
/** 최종 편집자가 사실 감사 근거까지 대조한 stage만 commit한다. */
const STAGE_PIPELINE_VERSION = 2
/**
 * 의심자는 검색을 건너뛰고 즉답하는 일이 잦아 남은 실패의 대부분을 차지한다. 실패한 시도는
 * 몇 초 만에 돌아오므로 횟수를 늘리는 편이 인물을 통째로 잃는 것보다 싸다.
 */
const MAX_SKEPTIC_RETRIES = 4
/** 조사·수정도 같은 이유로 헛돈다. 세 단계 모두 재시도로 회수한다. */
const MAX_RESEARCH_RETRIES = 2
const MAX_FIX_RETRIES = 1
/** 인물끼리는 독립이다. 한 인물 안의 조사→의심→수정만 순차이고, 인물 간에는 동시에 돈다. */
const DEFAULT_CONCURRENCY = 4
/** 이보다 적으면 생애를 읽는 연표가 아니다. 자료가 없으면 억지로 채우지 않고 보류한다. */
const MIN_EVENTS = 6
const ALLOWED_KINDS = new Set([
  'birth', 'death', 'education', 'work', 'publish', 'battle', 'travel', 'office', 'meeting', 'other',
])

type CandidateEvent = TimelineEventForKoreanReview

type StoredTimelineEvent = CandidateEvent & {
  id: string
  celeb_id: string
  source: string
  sort_order: number
  created_at?: string
  updated_at?: string
}

function timelineFingerprint(events: StoredTimelineEvent[]): string {
  return createHash('sha256').update(JSON.stringify(events)).digest('hex')
}

function webSourceHost(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

function distinctWebSourceCount(urls: Array<string | undefined>): number {
  return new Set(urls.map((url) => url ? webSourceHost(url.trim()) : null).filter(Boolean)).size
}

function finalPayload(event: Record<string, unknown>) {
  return {
    year: event.year ?? null,
    year_end: event.year_end ?? null,
    sequence_label: event.sequence_label ?? null,
    sequence_label_en: event.sequence_label_en ?? null,
    title: event.title,
    title_en: event.title_en,
    description: event.description,
    description_en: event.description_en,
    kind: event.kind,
    place_name: event.place_name ?? null,
    place_name_en: event.place_name_en ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    source: event.source,
    sort_order: event.sort_order,
  }
}

function candidateFromStored(event: StoredTimelineEvent): CandidateEvent {
  return {
    year: event.year,
    year_end: event.year_end,
    title: event.title,
    title_en: event.title_en,
    description: event.description,
    description_en: event.description_en,
    kind: event.kind,
    place_name: event.place_name,
    place_name_en: event.place_name_en,
    lat: event.lat,
    lng: event.lng,
  }
}

async function fetchStoredEvents(celebId: string): Promise<StoredTimelineEvent[]> {
  const { data, error } = await supabase
    .from('celeb_timeline_events')
    .select('*')
    .eq('celeb_id', celebId)
    .order('sort_order')
    .order('id')
  if (error) throw new Error(`기존 연표 조회 실패: ${error.message}`)
  return (data ?? []) as StoredTimelineEvent[]
}

type Defect = { index: number; field: string; current_value: string; correct_value: string; evidence: string }
type FactCheck = { index: number; evidence: string; source_urls: string[] }

const RESEARCHER_SCHEMA = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          year: { type: ['integer', 'null'] },
          year_end: { type: ['integer', 'null'] },
          title: { type: 'string' },
          title_en: { type: 'string' },
          description: { type: 'string' },
          description_en: { type: 'string' },
          kind: {
            type: 'string',
            enum: ['birth', 'death', 'education', 'work', 'publish', 'battle', 'travel', 'office', 'meeting', 'other'],
          },
          place_name: { type: ['string', 'null'] },
          place_name_en: { type: ['string', 'null'] },
          lat: { type: ['number', 'null'] },
          lng: { type: ['number', 'null'] },
        },
        required: [
          'year', 'year_end', 'title', 'title_en', 'description', 'description_en', 'kind',
          'place_name', 'place_name_en', 'lat', 'lng',
        ],
      },
    },
  },
  required: ['events'],
}

const SKEPTIC_SCHEMA = {
  type: 'object',
  properties: {
    defects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          field: { type: 'string' },
          current_value: { type: 'string' },
          correct_value: { type: 'string' },
          evidence: { type: 'string' },
        },
        required: ['index', 'field', 'current_value', 'correct_value', 'evidence'],
      },
    },
    zero_defects_indices: { type: 'array', items: { type: 'integer' } },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          evidence: { type: 'string' },
          source_urls: { type: 'array', items: { type: 'string' } },
        },
        required: ['index', 'evidence', 'source_urls'],
      },
    },
    // 성실성을 추론 토큰 같은 간접 지표로 재지 않는다. 실제로 연 출처를 산출물에 적게 하고
    // 그것으로 판정한다. 검색을 안 하면 이 배열을 채울 수 없다.
    sources: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          url: { type: 'string' },
          used_for: { type: 'string' },
        },
        required: ['name', 'url', 'used_for'],
      },
    },
  },
  required: ['defects', 'zero_defects_indices', 'checks', 'sources'],
}

type GrokResult = {
  structuredOutput?: Record<string, unknown>
  usage: { reasoning_tokens?: number }
  num_turns?: number
}

class GrokUnavailableError extends Error {}

function looksGrokUnavailable(message: string): boolean {
  return /couldn.?t start|credit|quota|usage limit|rate limit|payment|insufficient|\b429\b|\b402\b|resource exhausted|too many requests|grok exit (?:null|1):\s*$/i.test(message)
}

/**
 * 호출 규약(셸 우회·비동기 spawn·effort·작업 폴더 격리)은 grok-cli 스킬의 헬퍼가 쥔다.
 * 여기서 다시 짜지 않는다. 왜 그렇게 부르는지는 그 스킬 문서에 근거와 함께 있다.
 */
async function runGrok(promptText: string, schema: object): Promise<GrokResult> {
  try {
    const { raw } = await grokJson(promptText, schema, { effort: 'high', repoRoot: REPO_ROOT })
    return raw as GrokResult
  } catch (error) {
    const message = (error as Error).message
    if (looksGrokUnavailable(message)) throw new GrokUnavailableError(message)
    throw error
  }
}

function researcherPrompt(celeb: {
  id: string; slug: string; nickname: string; profession: string | null
  nationality: string | null; birth_date: string | null; death_date: string | null; celeb_tier: string
}): string {
  return [
    `너는 celeb_timeline_events 조사자다. 시작하기 전에 다음 두 파일을 반드시 읽고 규칙을 그대로 따른다.`,
    `- ${RELAY_DOC}`,
    `- ${TIMELINE_DOC}`,
    ``,
    `대상 인물`,
    `- id: ${celeb.id}`,
    `- slug: ${celeb.slug}`,
    `- 이름: ${celeb.nickname}`,
    `- 직업: ${celeb.profession ?? '미상'}`,
    `- 국적: ${celeb.nationality ?? '미상'}`,
    `- 생년월일: ${celeb.birth_date || '미상'}`,
    `- 사망: ${celeb.death_date || '없음(생존)'}`,
    `- 티어: ${celeb.celeb_tier}`,
    ``,
    `이 인물이 맞는지 먼저 확신하라. 동명이인과 섞지 마라. 문서의 조사자 절차·kind 표·좌표 규칙·서술`,
    `스타일을 그대로 따른다. 생애에서 중요한 사건을 보통 8~14개 조사하라. 출생은 포함하고, 사망일이`,
    `있을 때만 사망도 포함한다. 자료가 적더라도 6개보다 적으면 제출하지 말고, 사건 수를 맞추려고`,
    `중요하지 않은 일을 부풀리거나 확인되지 않은 일을 만들지 마라. 각 카드를 이어 읽으면 인생이`,
    `보이도록 사건 사이의 원인·선택·결과가 확인되는 대목을 서술에 담아`,
    `연도순으로 만들어라.`,
    ``,
    `place_name은 반드시 도시 단위로 적는다. 학교·회사·형무소·극장 이름을 place_name에 넣지 마라.`,
    `「연희전문학교」가 아니라 「서울」, 「후쿠오카 형무소」가 아니라 「후쿠오카」다. 기관 이름은 제목과`,
    `서술에 쓴다. 그리고 그 도시의 Wikidata P625 좌표를 lat·lng에 넣어라. 도시를 특정할 수 없을 때만`,
    `좌표를 비운다. 이 값들이 활동 반경 지도의 이동 경로가 된다.`,
    ``,
    `출력은 JSON 스키마를 따르는 events 배열 하나만. 설명문·마크다운·코드펜스 없이 순수 JSON만 출력하라.`,
  ].join('\n')
}

function skepticPrompt(celeb: { id: string; slug: string; nickname: string }, events: CandidateEvent[]): string {
  const list = events.map((event, index) => ({ index, ...event }))
  return [
    `이 행들은 틀렸다. DB에 쓰지 마라. 너는 새 세션의 의심자다. 이전 대화 맥락이 없다고 가정하고`,
    `독립적으로 검색해서 검증하라.`,
    ``,
    `시작하기 전에 다음 파일을 반드시 읽고 의심자 절차를 그대로 따른다.`,
    `- ${RELAY_DOC}`,
    ``,
    `대상 인물: ${celeb.nickname} (${celeb.slug}, id=${celeb.id})`,
    ``,
    `저장 예정인 후보 사건들(index로 지칭):`,
    JSON.stringify(list, null, 1),
    ``,
    `각 index의 각 필드에 대해 무죄를 독립적으로 증명하지 못하면 결함으로 적어라(사건 id 대신 index를 써라).`,
    `모든 필드가 무죄로 확인된 index만 zero_defects_indices에 넣어라. checks에는 모든 index를 정확히`,
    `한 번씩 넣고, 그 사건을 대조한 근거 요약과 서로 다른 실제 출처 URL을 source_urls에 두 곳 이상`,
    `적어라. 출력은 JSON 스키마만 따르는 순수 JSON.`,
    ``,
    `너는 사실만 판정한다. 최종 문장은 조사자가 쓴다. correct_value에는 완성된 서비스 문장이 아니라`,
    `무엇이 사실인지를 적어라. 확인이 안 되면 correct_value는 「비움」이다.`,
    `evidence에는 어느 출처가 그 값을 뒷받침하는지 적어라. 사건 자체가 일어나지 않았거나 다른 사람의`,
    `사건이면 field를 정확히 event로 적어라.`,
    ``,
    `반드시 웹을 검색하고, 실제로 연 출처를 sources 배열에 전부 적어라. 최소 두 곳 이상이다.`,
    `기억으로 답하지 마라. 검색 없이 「결함 0」을 쓰는 것은 검증이 아니다. 결함이 하나도 없더라도`,
    `무엇을 어디서 확인했는지 sources로 증명해야 그 판정이 인정된다.`,
  ].join('\n')
}

async function runSkepticWithRetry(
  celeb: { id: string; slug: string; nickname: string },
  events: CandidateEvent[],
  say: (m: string) => void,
) {
  const prompt = skepticPrompt(celeb, events)
  for (let attempt = 1; attempt <= 1 + MAX_SKEPTIC_RETRIES; attempt++) {
    let res: GrokResult
    try {
      res = await runGrok(prompt, SKEPTIC_SCHEMA)
    } catch (e) {
      if (e instanceof GrokUnavailableError) throw e
      // 타임아웃·일시 오류는 실패가 아니라 재시도 대상이다. 검증 없이 반영되는 일만 막으면 된다.
      say(`  의심자 ${attempt}회차 호출 실패(${(e as Error).message.slice(0, 120)}) — 재시도`)
      continue
    }
    const sources = (res.structuredOutput?.sources ?? []) as { name: string; url: string; used_for: string }[]
    const validSources = sources.filter((source, index, all) =>
      !!webSourceHost(source.url?.trim()) &&
      all.findIndex((candidate) => candidate.url?.trim() === source.url?.trim()) === index)
    const validSourceHosts = distinctWebSourceCount(validSources.map((source) => source.url))
    const defects = (res.structuredOutput?.defects ?? []) as Defect[]
    const zeroDefects = (res.structuredOutput?.zero_defects_indices ?? []) as number[]
    const checks = (res.structuredOutput?.checks ?? []) as FactCheck[]
    const defectIndices = new Set(defects.map((defect) => defect.index))
    const zeroIndices = new Set(zeroDefects)
    const checkIndices = new Set(checks.map((check) => check.index))
    const checksOk = checks.length === events.length && checkIndices.size === events.length &&
      checks.every((check) => {
        return Number.isInteger(check.index) && check.index >= 0 && check.index < events.length &&
          check.evidence?.trim().length > 0 &&
          distinctWebSourceCount(check.source_urls ?? []) >= MIN_SKEPTIC_SOURCES
      })
    const coverageOk = events.every((_, index) => defectIndices.has(index) || zeroIndices.has(index)) &&
      [...defectIndices, ...zeroIndices].every((index) => Number.isInteger(index) && index >= 0 && index < events.length) &&
      [...defectIndices].every((index) => typeof index === 'number' && !zeroIndices.has(index))
    if (validSourceHosts >= MIN_SKEPTIC_SOURCES && coverageOk && checksOk) {
      return {
        defects,
        zero_defects_indices: zeroDefects,
        checks,
        sources: validSources,
        attempt,
      }
    }
    const reasons = [
      validSourceHosts < MIN_SKEPTIC_SOURCES ? `독립 출처 도메인 ${validSourceHosts}곳` : null,
      !coverageOk ? `사건 판정 누락` : null,
      !checksOk ? `사건별 2개 출처 대조 누락` : null,
    ].filter(Boolean).join(', ')
    say(`  의심자 ${attempt}회차 ${reasons} — 전건 독립 검증으로 인정할 수 없어 재시도`)
  }
  return null
}

/**
 * 결함 목록을 조사자에게 돌려 고치게 한다(릴레이 문서 7단계).
 *
 * 의심자의 문장을 필드에 직접 꽂지 않는다. 의심자는 사실 판정자라 서비스 문장을 쓰게 하면
 * 「2018년 Birthday Honours에서 Knight Bachelor가 되었다」 같은 문장이 그대로 저장된다.
 * 사실은 의심자가 정하고, 문장은 처음 쓴 조사자가 다시 쓴다.
 */
function fixerPrompt(
  celeb: { id: string; slug: string; nickname: string },
  events: CandidateEvent[],
  defects: Defect[],
): string {
  const list = defects
    .map((d) => `- index=${d.index} / ${d.field} / 지금: ${d.current_value} / 올바른 값: ${d.correct_value} / 근거: ${d.evidence}`)
    .join('\n')
  return [
    `너는 이 인물의 연표를 쓴 조사자다. 검증자가 아래 결함을 찾아 돌려보냈다. 고쳐서 다시 제출하라.`,
    ``,
    `시작하기 전에 다음 두 파일을 반드시 읽는다. 특히 ${TIMELINE_DOC}의 「서술 쓰기」 룰북과 견본을 읽고`,
    `그 견본과 같은 수준의 문장으로 쓴다.`,
    `- ${RELAY_DOC}`,
    `- ${TIMELINE_DOC}`,
    ``,
    `대상 인물: ${celeb.nickname} (${celeb.slug})`,
    ``,
    `현재 사건 배열:`,
    JSON.stringify(events, null, 1),
    ``,
    `검증자가 지목한 결함:`,
    list,
    ``,
    `**사건을 지우거나 새로 넣지 마라.** 사건 자체가 사실이 아닌 후보는 이 단계 전에 재조사로 분리했다.`,
    `여기 남은 결함은 사건 안의 확인되지 않은 대목이다. 그 대목만 덜어내거나 바로잡고 사건과 배열`,
    `순서는 보존한다. 입력이 ${events.length}건이면 출력도 반드시 ${events.length}건이다.`,
    ``,
    `그 밖에 지킬 것.`,
    `- 결함이 지목한 사실을 반영해 그 사건의 문장을 자연스럽게 다시 써라. 지적된 단어만 갈아끼우지 마라.`,
    `- 확인이 갈리는 세부는 문장에서 덜어내고, 확인된 사실만으로 문장을 완성해라.`,
    `- 결함이 지목되지 않은 사건은 문장을 그대로 둔다.`,
    `- 좌표는 장소명이 있을 때만 남긴다. 확인되지 않으면 좌표를 비우고 장소명만 남긴다.`,
    ``,
    `출력은 고친 뒤의 events 배열 전체다. JSON 스키마를 따르는 순수 JSON만 출력하라.`,
  ].join('\n')
}

/**
 * 저장을 막는 것은 구조가 깨진 행뿐이다. 문장의 좋고 나쁨은 정규식으로 판정하지 않는다.
 * 문체는 룰북과 견본으로 모델이 뚫는다. 규칙 원문과 견본은 celeb-timeline.md가 쥔다.
 */
function inspectStructure(events: CandidateEvent[]): string[] {
  const violations: string[] = []
  let previousKnownYear: number | null = null
  for (const [i, ev] of events.entries()) {
    if (!(ev.title ?? '').trim()) violations.push(`index=${i} 제목 없음`)
    if (!(ev.title_en ?? '').trim()) violations.push(`index=${i} 영문 제목 없음`)
    if (!(ev.description ?? '').trim()) violations.push(`index=${i} 국문 서술 없음`)
    if (!(ev.description_en ?? '').trim()) violations.push(`index=${i} 영문 서술 없음`)
    if (!(ev.year === null || Number.isInteger(ev.year))) violations.push(`index=${i} 시작 연도가 정수/null이 아님`)
    if (!(ev.year_end === null || Number.isInteger(ev.year_end))) violations.push(`index=${i} 끝 연도가 정수/null이 아님`)
    if (ev.year === 0 || ev.year_end === 0) violations.push(`index=${i} 역사 연도 0은 쓸 수 없음`)
    if (ev.year !== null && ev.year_end !== null && ev.year_end < ev.year) violations.push(`index=${i} 끝 연도가 시작보다 앞섬`)
    if (!ALLOWED_KINDS.has(ev.kind)) violations.push(`index=${i} 허용되지 않은 kind=${ev.kind}`)
    if (!(ev.place_name === null || typeof ev.place_name === 'string')) violations.push(`index=${i} 국문 장소가 string/null이 아님`)
    if (!(ev.place_name_en === null || typeof ev.place_name_en === 'string')) violations.push(`index=${i} 영문 장소가 string/null이 아님`)
    const latOk = ev.lat === null || (typeof ev.lat === 'number' && Number.isFinite(ev.lat) && ev.lat >= -90 && ev.lat <= 90)
    const lngOk = ev.lng === null || (typeof ev.lng === 'number' && Number.isFinite(ev.lng) && ev.lng >= -180 && ev.lng <= 180)
    if (!latOk) violations.push(`index=${i} 위도 범위·형식 오류`)
    if (!lngOk) violations.push(`index=${i} 경도 범위·형식 오류`)
    if ((ev.lat === null) !== (ev.lng === null)) violations.push(`index=${i} 위·경도 짝이 깨짐`)
    if (Number.isInteger(ev.year)) {
      if (previousKnownYear !== null && ev.year! < previousKnownYear) {
        violations.push(`index=${i} 연도 ${ev.year}가 앞 사건 ${previousKnownYear}보다 이르게 배치됨`)
      }
      previousKnownYear = ev.year
    }
  }
  return violations
}

/**
 * 실존 인물의 날짜 모양을 강제한다. 날짜 미상이면 시작·끝 연도가 모두 비어야 한다는 것은
 * DB 제약이기도 하다. 시작 없이 끝만 남은 행이 삽입에서 통째로 배치를 되돌린다.
 */
function enforceDateInvariants(events: CandidateEvent[]): string[] {
  const notes: string[] = []
  for (const [i, ev] of events.entries()) {
    if (ev.year === null && ev.year_end !== null) {
      notes.push(`날짜 정리: index=${i} 시작 연도 없이 끝 연도(${ev.year_end})만 있어 비움`)
      ev.year_end = null
    }
    if (ev.year !== null && ev.year_end !== null && ev.year_end < ev.year) {
      notes.push(`날짜 정리: index=${i} 끝 연도(${ev.year_end})가 시작(${ev.year})보다 앞서 비움`)
      ev.year_end = null
    }
  }
  return notes
}

/**
 * 저장 직전 좌표·장소 짝을 강제한다. 규칙은 celeb-timeline.md가 쥔다.
 * 좌표는 선택 필드이므로, 짝이 깨지면 사건을 버리지 않고 좌표만 떨어뜨린다.
 */
function enforcePlaceInvariants(events: CandidateEvent[]): string[] {
  const notes: string[] = []
  for (const [i, ev] of events.entries()) {
    const blank = (v: string | null) => v === null || v === undefined || String(v).trim() === ''
    if (ev.lat === null || ev.lng === null) {
      if (ev.lat !== null || ev.lng !== null) {
        ev.lat = null; ev.lng = null
        notes.push(`좌표 정리: index=${i} 위·경도 한쪽만 있어 둘 다 비움`)
      }
      continue
    }
    if (blank(ev.place_name) && blank(ev.place_name_en)) {
      ev.lat = null; ev.lng = null
      notes.push(`좌표 정리: index=${i} 장소명이 없어 좌표 비움`)
    }
  }
  return notes
}

async function processCeleb(
  slug: string,
  dry: boolean,
  stageDir?: string,
  replaceExisting = false,
  auditExisting = false,
  emit?: (m: string) => void,
) {
  const say = emit ?? ((m: string) => console.log(m))
  const { data: celeb, error } = await supabase
    .from('celebs')
    .select('id,slug,nickname,profession,nationality,birth_date,death_date,celeb_tier')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !celeb) { say(`FAILED ${slug} — 프로필 조회 실패`); return 'failed' as const }
  if (celeb.celeb_tier === 'fiction') { say(`FAILED ${slug} — fiction 티어는 이 스크립트가 지원하지 않음`); return 'failed' as const }

  let currentEvents: StoredTimelineEvent[]
  try {
    currentEvents = await fetchStoredEvents(celeb.id)
  } catch (fetchError) {
    say(`FAILED ${slug} — ${(fetchError as Error).message}`)
    return 'failed' as const
  }
  if (currentEvents.length > 0 && !replaceExisting) {
    say(`SKIPPED ${slug} — 이미 사건 ${currentEvents.length}건 있음`)
    return 'skipped' as const
  }
  if (currentEvents.length === 0 && replaceExisting) {
    say(`SKIPPED ${slug} — 교체할 기존 사건이 없음`)
    return 'skipped' as const
  }
  const stageIdentity = replaceExisting ? {
    mode: 'replace' as const,
    before_fingerprint: timelineFingerprint(currentEvents),
    before_events: currentEvents,
  } : { mode: 'insert' as const }

  say(`${auditExisting ? '기존 연표 감사' : '조사'} 시작: ${slug} (${celeb.nickname})`)
  // 자료가 넘치는 인물에서도 빈손으로 돌아오는 일이 있다. 자료 부족이 아니라 호출 문제이므로
  // 의심자와 같이 재시도로 회수한다.
  let events: CandidateEvent[] = auditExisting ? currentEvents.map(candidateFromStored) : []
  if (!auditExisting) {
    for (let attempt = 1; attempt <= 1 + MAX_RESEARCH_RETRIES; attempt++) {
      try {
        const res = await runGrok(researcherPrompt(celeb), RESEARCHER_SCHEMA)
        events = (res.structuredOutput?.events ?? []) as CandidateEvent[]
      } catch (e) {
        if (e instanceof GrokUnavailableError) throw e
        say(`  조사 ${attempt}회차 호출 실패(${(e as Error).message.slice(0, 90)}) — 재시도`)
        continue
      }
      if (events.length >= MIN_EVENTS) break
      say(`  조사 ${attempt}회차 사건 ${events.length}건 — 재시도`)
    }
    if (events.length < MIN_EVENTS) {
      say(`FAILED ${slug} — 조사자가 ${MAX_RESEARCH_RETRIES + 1}회 모두 사건을 못 만듦(${events.length}건)`)
      return 'failed' as const
    }
  }

  const skeptic = await runSkepticWithRetry(celeb, events, say)
  if (!skeptic) { say(`FAILED ${slug} — 의심자가 ${MAX_SKEPTIC_RETRIES + 1}회 모두 출처 없이 답함. 반영 보류`); return 'failed' as const }

  const rejectedEvents = skeptic.defects.filter((defect) =>
    defect.field.trim().toLowerCase() === 'event' || defect.field.includes('사건'))
  if (rejectedEvents.length > 0) {
    const reason = rejectedEvents
      .map((defect) => `index=${defect.index}: ${defect.evidence}`)
      .join(' / ')
    if (!dry && stageDir) {
      const heldDir = resolve(stageDir, '..', 'needs-research')
      mkdirSync(heldDir, { recursive: true })
      writeFileSync(resolve(heldDir, `${slug}.json`), JSON.stringify({
        pipeline_version: STAGE_PIPELINE_VERSION,
        slug,
        celeb_id: celeb.id,
        ...stageIdentity,
        events,
        fact_review: skeptic,
        research_needed_reason: reason,
      }, null, 1), 'utf8')
    }
    say(`HELD ${slug} — 사건 자체가 사실이 아닌 후보 ${rejectedEvents.length}건. 처음부터 재조사해야 함`)
    return 'held' as const
  }

  let kept = events
  if (skeptic.defects.length > 0) {
    for (const d of skeptic.defects) say(`  결함: index=${d.index} ${d.field} → ${d.correct_value}`)
    const defectIndices = new Set(skeptic.defects.map((defect) => defect.index))
    let accepted = false
    for (let attempt = 1; attempt <= 1 + MAX_FIX_RETRIES; attempt++) {
      let candidate: CandidateEvent[]
      try {
        const fixed = await runGrok(fixerPrompt(celeb, events, skeptic.defects), RESEARCHER_SCHEMA)
        candidate = (fixed.structuredOutput?.events ?? []) as CandidateEvent[]
      } catch (e) {
        if (e instanceof GrokUnavailableError) throw e
        say(`  수정 ${attempt}회차 호출 실패(${(e as Error).message.slice(0, 90)}) — 재시도`)
        continue
      }
      if (candidate.length !== events.length) {
        say(`  수정 ${attempt}회차 사건 수를 ${events.length}건에서 ${candidate.length}건으로 바꿈 — 재시도`)
        continue
      }
      const touchedCleanIndex = events.findIndex((event, index) =>
        !defectIndices.has(index) &&
        JSON.stringify(finalPayload(candidate[index])) !== JSON.stringify(finalPayload(event)))
      if (touchedCleanIndex >= 0) {
        say(`  수정 ${attempt}회차 결함이 없던 index=${touchedCleanIndex}까지 바꿈 — 재시도`)
        continue
      }
      kept = candidate
      accepted = true
      break
    }
    if (!accepted) {
      say(`FAILED ${slug} — 수정 단계가 ${MAX_FIX_RETRIES + 1}회 모두 사건 수·무결함 행을 보존하지 못했다. 반영 보류`)
      return 'failed' as const
    }
    say(`  수정 완료: 결함 ${skeptic.defects.length}건 반영, 사건 ${kept.length}건 보존`)
  }

  let proseReview: KoreanProseReview
  try {
    proseReview = await reviewKoreanTimeline(
      { slug: celeb.slug, nickname: celeb.nickname },
      kept,
      skeptic,
    )
  } catch (error) {
    say(`FAILED ${slug} — 한국어 편집 실패: ${(error as Error).message.slice(0, 160)}`)
    return 'failed' as const
  }
  kept = proseReview.events
  say(`  한국어 편집: ${proseReview.status}, 수정 ${proseReview.changed_indices.length}건`)
  if (proseReview.status === 'fact_check' || proseReview.status === 'research_needed') {
    for (const item of proseReview.fact_check) say(`  사실 확인 보류: index=${item.index} ${item.reason}`)
    if (proseReview.research_needed_reason) say(`  생애 구성 재조사: ${proseReview.research_needed_reason}`)
    if (!dry && stageDir) {
      const heldDir = resolve(stageDir, '..', proseReview.status === 'fact_check' ? 'fact-check' : 'needs-research')
      mkdirSync(heldDir, { recursive: true })
      writeFileSync(resolve(heldDir, `${slug}.json`), JSON.stringify({
        pipeline_version: STAGE_PIPELINE_VERSION,
        slug,
        celeb_id: celeb.id,
        ...stageIdentity,
        events: kept,
        fact_review: skeptic,
        korean_prose_review: {
          status: proseReview.status,
          summary: proseReview.summary,
          issues: proseReview.issues,
          fact_check: proseReview.fact_check,
          research_needed_reason: proseReview.research_needed_reason,
          changed_indices: proseReview.changed_indices,
        },
      }, null, 1), 'utf8')
    }
    say(`HELD ${slug} — ${proseReview.status === 'fact_check'
      ? '문장만으로 확정할 수 없는 사실이 있음'
      : '현재 사건 선택만으로 생애를 읽을 수 없음'}. staging하지 않음`)
    return 'held' as const
  }

  for (const n of enforcePlaceInvariants(kept)) say(`  ${n}`)
  for (const n of enforceDateInvariants(kept)) say(`  ${n}`)

  const broken = inspectStructure(kept)
  if (celeb.death_date) {
    if (!kept.some((e) => e.kind === 'birth')) broken.push('사망자인데 출생 사건 없음')
    if (!kept.some((e) => e.kind === 'death')) broken.push('사망자인데 사망 사건 없음')
  }
  if (broken.length > 0) {
    for (const v of broken) say(`  구조 결함: ${v}`)
    say(`FAILED ${slug} — 필수값 누락 ${broken.length}건. 반영 보류`)
    return 'failed' as const
  }

  // 여섯 건보다 적으면 생애를 읽는 연표가 아니다. 자료가 없거나 조사가 실패한 것이니 내지 않는다.
  if (kept.length < MIN_EVENTS) {
    say(`FAILED ${slug} — 사건 ${kept.length}건뿐이라 연표가 되지 않는다. 반영 보류`)
    return 'failed' as const
  }

  const tail = `결함 ${skeptic.defects.length}건 수정, 출처 ${skeptic.sources.length}곳 (의심자 ${skeptic.attempt}회차)`
  if (dry) { say(`DRY  ${slug} — ${kept.length}건, ${tail}`); return 'ok' as const }

  // 사실은 그록이 검증했다. 문장이 쓸만한지는 사람이 본다. 대기열에 놓고 승인 뒤에 넣는다.
  if (stageDir) {
    mkdirSync(stageDir, { recursive: true })
    const file = resolve(stageDir, `${slug}.json`)
    writeFileSync(file, JSON.stringify({
      pipeline_version: STAGE_PIPELINE_VERSION,
      slug,
      celeb_id: celeb.id,
      ...stageIdentity,
      events: kept,
      fact_review: skeptic,
      korean_prose_review: {
        status: proseReview.status,
        summary: proseReview.summary,
        issues: proseReview.issues,
        fact_check: proseReview.fact_check,
        research_needed_reason: proseReview.research_needed_reason,
        changed_indices: proseReview.changed_indices,
      },
    }, null, 1), 'utf8')
    say(`STAGED ${slug} — ${kept.length}건 대기, ${tail}`)
    return 'ok' as const
  }
  throw new Error(`${slug}: --stage 없이 DB에 직접 반영할 수 없다`)
}

function argOf(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

/**
 * 6단계 사람 검토용 출력. 한 사람의 연표를 위에서 아래로 읽어 그 사람이 지나온 길이 잡히는지 본다.
 *
 * 판정 기준은 규칙 위반 개수가 아니다. 읽어서 그림이 그려지면 통과다. 규칙에 걸려도 문맥에서
 * 자연스러우면 넘어가고, 규칙을 다 지켰어도 아무것도 안 남으면 반려한다.
 * 겹침 표시는 참고용 표지이지 결함 판정이 아니다.
 */
async function reviewStaged() {
  const dir = argOf('dir') ?? '.tmp-celeb-timeline-grok/staged'
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  if (files.length === 0) { console.log(`${dir} 에 검토할 파일이 없다.`); return }

  for (const f of files) {
    const { slug, events } = JSON.parse(readFileSync(resolve(dir, f), 'utf8')) as
      { slug: string; events: CandidateEvent[] }
    console.log(`\n=== ${slug} — 위에서 아래로 읽어 서사가 잡히는지 본다 (${events.length}건) ===\n`)
    for (const e of events) {
      const head = (e.description ?? '').slice(0, 60)
      const stem = (e.title ?? '').slice(0, 8)
      const echo = stem.length >= 4 && head.indexOf(stem) >= 0 && head.indexOf(stem) <= 2 ? ' (제목겹침)' : ''
      const span = e.year_end && e.year_end !== e.year ? `${e.year}~${e.year_end}` : `${e.year ?? '연도미상'}`
      console.log(`${span}  ${e.title}${echo}`)
      console.log(`      ${e.description}`)
      if (!(e.description_en ?? '').trim()) console.log(`      [영문 서술 없음]`)
      console.log()
    }
  }
}

/**
 * 사람이 읽어야 할 것만 골라낸다. 통과 기준이 아니라 **선별기**다.
 *
 * 문장의 좋고 나쁨은 판정하지 않는다. 다만 「제목을 되풀이할 뿐 정보가 없는 연표」는 실측으로
 * 반복해 나왔고 눈으로 훑으면 놓친다. 림종혁은 여섯 줄이 모두 이름으로 시작해 제목을 되풀이했는데
 * 제목 위치 기반 탐지는 이름이 앞에 붙어 밀리는 바람에 놓쳤다. 같은 첫 단어 반복이 그 표지다.
 *
 * 걸린 인물은 반려가 아니라 보류다. 사람이 읽고 판단한다.
 */
function screenForReview(events: CandidateEvent[]): string | null {
  const firsts = events.map((e) => (e.description ?? '').trim().split(/\s+/)[0] ?? '')
  const tally = new Map<string, number>()
  for (const w of firsts) tally.set(w, (tally.get(w) ?? 0) + 1)
  const [word, n] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
  if (n >= 3 && n / events.length >= 0.4) return `같은 첫 단어 「${word}」가 ${n}/${events.length}줄`

  const echoed = events.filter((e) => {
    const head = (e.description ?? '').slice(0, 70)
    const stem = (e.title ?? '').slice(0, 8)
    return stem.length >= 4 && head.indexOf(stem) >= 0 && head.indexOf(stem) <= 6
  }).length
  if (echoed / events.length >= 0.4) return `제목 되풀이 ${echoed}/${events.length}줄`

  const shortest = Math.min(...events.map((e) => (e.description ?? '').length))
  if (shortest < 15) return `서술 최단 ${shortest}자`
  return null
}

/**
 * 승인된 대기열만 DB에 넣는다. 사람이 읽고 쓸만하다고 판단한 파일만 여기로 온다.
 * 교체 stage는 조사 시작 때 읽은 기존 연표 지문과 현재 DB가 같을 때만 반영한다.
 */
async function commitStaged() {
  const dir = argOf('dir') ?? '.tmp-celeb-timeline-grok/staged'
  const dry = process.argv.includes('--dry')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  if (files.length === 0) { console.log(`${dir} 에 승인 대기 파일이 없다.`); return }

  // 처리한 파일은 대기열 밖으로 옮긴다. 지우기만 하면 실패했을 때 조용히 남아 다음 검토에
  // 다시 섞이고, 이미 반영된 인물이 미검토분처럼 계측된다.
  const doneDir = resolve(dir, '..', 'applied')
  const heldDir = resolve(dir, '..', 'held')
  const backupDir = resolve(dir, '..', 'backups')
  if (!dry) {
    mkdirSync(doneDir, { recursive: true })
    mkdirSync(heldDir, { recursive: true })
    mkdirSync(backupDir, { recursive: true })
  }
  const move = (full: string, name: string, to: string) => {
    const target = resolve(to, name)
    if (existsSync(target)) throw new Error(`대기열 이동 대상이 이미 있음: ${target}`)
    renameSync(full, target)
  }
  const retire = (full: string, name: string) => move(full, name, doneDir)
  const hold = (full: string, name: string) => { if (!dry) move(full, name, heldDir) }
  // --all 은 선별기를 끄고 전부 넣는다. 보류분을 사람이 읽고 통과시킬 때 쓴다.
  const screenOff = process.argv.includes('--all')
  let held = 0

  let ok = 0, skipped = 0, failed = 0
  for (const f of files) {
    const full = resolve(dir, f)
    const {
      pipeline_version, slug, celeb_id, mode = 'insert', before_fingerprint, before_events, events, fact_review,
      korean_prose_review,
    } = JSON.parse(readFileSync(full, 'utf8')) as {
      pipeline_version?: number
      slug: string
      celeb_id: string
      mode?: 'insert' | 'replace'
      before_fingerprint?: string
      before_events?: StoredTimelineEvent[]
      events: CandidateEvent[]
      fact_review?: {
        defects?: Array<{ index?: number }>
        zero_defects_indices?: number[]
        checks?: Array<{ index?: number; evidence?: string; source_urls?: string[] }>
        sources?: Array<{ url?: string }>
      }
      korean_prose_review?: { status?: string; fact_check?: unknown[] }
    }

    if (pipeline_version !== STAGE_PIPELINE_VERSION) {
      console.log(`HELD ${slug} — 구버전 stage라 최종 편집자가 사실 감사 근거를 대조하지 않음`)
      hold(full, f)
      held++
      continue
    }

    const factSourceCount = distinctWebSourceCount((fact_review?.sources ?? []).map((source) => source.url))
    const checks = fact_review?.checks ?? []
    const checkIndices = new Set(checks.map((check) => check.index))
    const perEventChecksOk = checks.length === events.length && checkIndices.size === events.length &&
      checks.every((check) => Number.isInteger(check.index) && check.index! >= 0 && check.index! < events.length &&
        distinctWebSourceCount(check.source_urls ?? []) >= MIN_SKEPTIC_SOURCES && !!check.evidence?.trim())
    const defectIndices = new Set((fact_review?.defects ?? []).map((defect) => defect.index))
    const zeroIndices = new Set(fact_review?.zero_defects_indices ?? [])
    const verdictCoverageOk = events.every((_, index) => defectIndices.has(index) || zeroIndices.has(index)) &&
      [...defectIndices, ...zeroIndices].every((index) =>
        Number.isInteger(index) && index! >= 0 && index! < events.length) &&
      [...defectIndices].every((index) => typeof index === 'number' && !zeroIndices.has(index))
    if (!fact_review || !Array.isArray(fact_review.defects) ||
      !Array.isArray(fact_review.zero_defects_indices) || factSourceCount < MIN_SKEPTIC_SOURCES ||
      !perEventChecksOk || !verdictCoverageOk) {
      console.log(`HELD ${slug} — 독립 사실 감사 기록이 없거나 유효 출처가 부족함`)
      hold(full, f)
      held++
      continue
    }

    if (!korean_prose_review || !['pass', 'revised'].includes(korean_prose_review.status ?? '') ||
      (korean_prose_review.fact_check?.length ?? 0) > 0) {
      console.log(`HELD ${slug} — 독립 한국어 편집을 통과한 기록이 없음`)
      hold(full, f)
      held++
      continue
    }

    const current = await fetchStoredEvents(celeb_id)
    if (mode === 'insert' && current.length > 0) {
      console.log(`SKIPPED ${slug} — 이미 사건 ${current.length}건 있음`)
      if (!dry) retire(full, f)
      skipped++
      continue
    }
    if (mode === 'replace') {
      if (!before_fingerprint || !before_events || before_events.length === 0) {
        console.log(`HELD ${slug} — 교체 전 스냅샷이나 지문이 없음`)
        hold(full, f)
        held++
        continue
      }
      const currentFingerprint = timelineFingerprint(current)
      if (currentFingerprint !== before_fingerprint) {
        console.log(`HELD ${slug} — 조사 뒤 라이브 연표가 바뀌어 교체하지 않음`)
        hold(full, f)
        held++
        continue
      }
    }

    const broken = inspectStructure(events)
    if (broken.length) { console.log(`FAILED ${slug} — 필수값 누락 ${broken.length}건`); failed++; continue }

    const flag = screenOff ? null : screenForReview(events)
    if (flag) {
      console.log(`HELD ${slug} — ${flag}. 사람이 읽을 것`)
      hold(full, f)
      held++
      continue
    }
    // 대기열 파일이 옛 규칙으로 만들어졌을 수 있다. 삽입 직전에 한 번 더 모양을 맞춘다.
    for (const n of [...enforcePlaceInvariants(events), ...enforceDateInvariants(events)]) console.log(`  ${slug} ${n}`)

    const rows = events.map((e, i) => ({ celeb_id, ...e, source: 'manual', sort_order: (i + 1) * 10 }))
    if (dry) {
      console.log(`READY ${slug} — ${mode === 'replace' ? `${current.length}건 → ` : ''}${rows.length}건, DB 미반영`)
      ok++
      continue
    }
    if (mode === 'replace') {
      const backupFile = resolve(backupDir, `${slug}-${before_fingerprint}.json`)
      if (!existsSync(backupFile)) {
        writeFileSync(backupFile, JSON.stringify({
          slug,
          celeb_id,
          fingerprint: before_fingerprint,
          events: before_events,
        }, null, 1), 'utf8')
      }
      const { error: deleteError } = await supabase.from('celeb_timeline_events').delete().eq('celeb_id', celeb_id)
      if (deleteError) {
        console.log(`FAILED ${slug} — 기존 연표 삭제 실패: ${deleteError.message}`)
        failed++
        continue
      }
    }
    const { data: inserted, error } = await supabase
      .from('celeb_timeline_events').insert(rows).select('id,title,description')
    if (error || !inserted) {
      if (mode === 'replace' && before_events) {
        const { error: restoreError } = await supabase.from('celeb_timeline_events').insert(before_events)
        if (restoreError) {
          throw new Error(`CRITICAL ${slug} — 새 연표 삽입과 원본 복구가 모두 실패했다: ${error?.message}; 복구: ${restoreError.message}`)
        } else {
          console.log(`FAILED ${slug} — 새 연표 삽입 실패, 기존 ${before_events.length}건 복구 완료: ${error?.message}`)
        }
      } else {
        console.log(`FAILED ${slug} — 삽입 실패: ${error?.message}`)
      }
      failed++
      continue
    }

    const after = await fetchStoredEvents(celeb_id)
    const roundTripMatches = JSON.stringify(after.map((row) => finalPayload(row))) ===
      JSON.stringify(rows.map((row) => finalPayload(row)))
    if (!roundTripMatches) {
      const { error: cleanupError } = await supabase
        .from('celeb_timeline_events').delete().in('id', inserted.map((row) => row.id))
      if (cleanupError) throw new Error(`CRITICAL ${slug} — 왕복 불일치 뒤 새 행 제거 실패: ${cleanupError.message}`)
      if (mode === 'replace' && before_events) {
        const { error: restoreError } = await supabase.from('celeb_timeline_events').insert(before_events)
        if (restoreError) throw new Error(`CRITICAL ${slug} — 왕복 불일치 뒤 원본 복구 실패: ${restoreError.message}`)
        else console.log(`FAILED ${slug} — 왕복 검증 불일치, 기존 ${before_events.length}건 복구 완료`)
      } else {
        console.log(`FAILED ${slug} — 왕복 검증 불일치, 방금 삽입한 행 제거 완료`)
      }
      failed++
      continue
    }

    retire(full, f)
    console.log(`OK   ${slug} — ${mode === 'replace' ? `${current.length}건 → ` : ''}${inserted.length}건 저장`)
    ok++
  }
  console.log(`\n## ${dry ? '사전 검증' : '반영'} 결과`)
  console.log(JSON.stringify({ ok, skipped, failed, held }))
  if (held > 0) console.log(dry
    ? `보류 ${held}건을 찾았다. --dry이므로 파일은 옮기지 않았다.`
    : `보류 ${held}건은 ${heldDir} 에 있다. 읽고 통과시키려면 그 폴더를 --dir 로 주고 --all 로 커밋한다.`)
  if (failed > 0) process.exit(1)
}

async function main() {
  if (process.argv[2] === 'review') { await reviewStaged(); return }
  if (process.argv[2] === 'commit') { await commitStaged(); return }
  if (process.argv[2] !== 'run') {
    console.error('사용법: run --auto [--total N] [--lanes N] --stage | run --auto-existing [--min-events 1] [--max-events 16] [--exclude-file done.json] --stage | run --include-file done.json --audit-existing --stage | run --slugs a,b [--replace-existing|--audit-existing] --stage | review | commit')
    process.exit(1)
  }
  const dry = process.argv.includes('--dry')
  // 조사 결과는 언제나 사람 승인을 거친다. --dry 외에 즉시 DB 반영 경로는 없다.
  const stageDir = process.argv.includes('--stage')
    ? resolve(argOf('dir') ?? '.tmp-celeb-timeline-grok/staged')
    : undefined
  if (!dry && !stageDir) throw new Error('run은 반드시 --stage로 실행한다. 즉시 DB 반영은 허용하지 않는다')
  const autoExisting = process.argv.includes('--auto-existing')
  const auditExisting = process.argv.includes('--audit-existing')
  const replaceExisting = autoExisting || auditExisting || process.argv.includes('--replace-existing')
  let slugs = (argOf('slugs') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  const includeFile = argOf('include-file')
  if (includeFile) {
    slugs = JSON.parse(readFileSync(resolve(includeFile), 'utf8')) as string[]
    console.log(`${includeFile}에서 ${slugs.length}명을 불러왔다.`)
  }

  if (process.argv.includes('--auto')) {
    if (autoExisting) throw new Error('--auto와 --auto-existing은 함께 쓸 수 없다')
    slugs = await fetchEmptyCelebSlugs(process.argv.includes('--deceased'))
    console.log(`연표가 빈 인물 ${slugs.length}명을 후보로 잡았다.`)
  }
  if (autoExisting) {
    const minEvents = Number.parseInt(argOf('min-events') ?? '1', 10)
    const maxArg = argOf('max-events')
    const maxEvents = maxArg ? Number.parseInt(maxArg, 10) : Number.POSITIVE_INFINITY
    slugs = await fetchExistingCelebSlugs(minEvents, maxEvents)
    console.log(`기존 사건 ${minEvents}~${Number.isFinite(maxEvents) ? maxEvents : '∞'}건인 실존 인물 ${slugs.length}명을 후보로 잡았다.`)
  }
  const excludeFile = argOf('exclude-file')
  if (excludeFile) {
    const excluded = new Set(JSON.parse(readFileSync(resolve(excludeFile), 'utf8')) as string[])
    const before = slugs.length
    slugs = slugs.filter((slug) => !excluded.has(slug))
    console.log(`${excludeFile}의 ${before - slugs.length}명을 후보에서 제외했다.`)
  }
  if (stageDir && !process.argv.includes('--force')) {
    const artifactDirs = [
      stageDir,
      resolve(stageDir, '..', 'fact-check'),
      resolve(stageDir, '..', 'needs-research'),
      resolve(stageDir, '..', 'held'),
      resolve(stageDir, '..', 'applied'),
    ]
    const before = slugs.length
    slugs = slugs.filter((slug) => !artifactDirs.some((dir) => existsSync(resolve(dir, `${slug}.json`))))
    if (before !== slugs.length) console.log(`기존 stage·보류·반영 산출물 ${before - slugs.length}명을 건너뛴다.`)
    if (before > 0 && slugs.length === 0) {
      console.log('선정된 대상은 모두 기존 산출물에 있다. 새로 실행할 인물이 없다.')
      return
    }
  }
  if (slugs.length === 0) throw new Error('--slugs, --include-file, --auto 또는 --auto-existing이 필요하다')

  // --total 은 이번에 처리할 인원이다. 레인 수와 무관하며, 생략하면 후보 전부를 돈다.
  const totalArg = argOf('total') ?? argOf('limit')
  const total = totalArg ? Math.min(Number.parseInt(totalArg, 10), slugs.length) : slugs.length
  const lanes = Math.max(1, Number.parseInt(argOf('lanes') ?? argOf('concurrency') ?? String(DEFAULT_CONCURRENCY), 10))

  console.log(`레인 ${lanes}개로 ${total}명을 릴레이한다. 레인이 비면 즉시 다음 인물을 배정한다.\n`)

  let ok = 0, skipped = 0, held = 0, failed = 0, started = 0, done = 0
  let grokHalted: string | null = null
  const queue = slugs.slice(0, total)

  /** 한 레인은 자기 대상을 끝내는 즉시 다음 대상을 집는다. 배치가 닫히길 기다리지 않는다. */
  const lane = async (laneNo: number) => {
    for (;;) {
      if (grokHalted) return
      const slug = queue.shift()
      if (!slug) return
      const seq = ++started
      // 레인들이 동시에 찍으면 로그가 섞인다. 한 인물의 출력을 모아 한 번에 내보낸다.
      const lines: string[] = []
      let r: Awaited<ReturnType<typeof processCeleb>>
      try {
        r = await processCeleb(slug, dry, stageDir, replaceExisting, auditExisting, (m) => lines.push(m))
      } catch (error) {
        if (error instanceof GrokUnavailableError) {
          grokHalted = error.message
          done++
          console.log([`--- 레인${laneNo} [${seq}/${total}] ${slug}`, ...lines,
            `HALTED — 그록을 시작할 수 없어 남은 ${queue.length}명을 배정하지 않음: ${error.message.slice(0, 180)}`].join('\n'))
          return
        }
        throw error
      }
      done++
      console.log([`--- 레인${laneNo} [${seq}/${total}] ${slug} (완료 ${done}, 대기 ${queue.length})`, ...lines].join('\n'))
      if (r === 'ok') ok++
      else if (r === 'skipped') skipped++
      else if (r === 'held') held++
      else failed++
    }
  }
  await Promise.all(Array.from({ length: Math.min(lanes, queue.length) }, (_, i) => lane(i + 1)))

  console.log(`\n## 결과 (${dry ? 'DRY-RUN' : 'STAGE'}) — 요청 ${total}명, 완료 ${done}명`)
  console.log(JSON.stringify({ ok, skipped, held, failed, pending: queue.length, grok_halted: !!grokHalted }))
}

type PageFilter = {
  column: string
  operator: 'eq' | 'neq'
  value: string
}

async function fetchPages<T>(table: string, cols: string, filters: readonly PageFilter[] = []): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    let query = supabase.from(table).select(cols)
    for (const filter of filters) {
      query = filter.operator === 'eq'
        ? query.eq(filter.column, filter.value)
        : query.neq(filter.column, filter.value)
    }
    const { data, error } = await query.order('id').range(from, from + 999)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) return rows
  }
}

async function fetchActiveRealCelebs() {
  return fetchPages<{ id: string; slug: string; death_date: string | null }>(
    'celebs',
    'id,slug,death_date',
    [
      { column: 'publication_status', operator: 'eq', value: 'active' },
      { column: 'celeb_tier', operator: 'neq', value: 'fiction' },
    ],
  )
}

/** 연표가 한 건도 없는 공개 실존 인물을 한 번에 모은다. 인물마다 count를 날리면 느리다. */
async function fetchEmptyCelebSlugs(deceasedOnly = false): Promise<string[]> {
  const celebs = await fetchActiveRealCelebs()
  const events = await fetchPages<{ celeb_id: string }>('celeb_timeline_events', 'id,celeb_id')
  const filled = new Set(events.map((e) => e.celeb_id))
  const empty = celebs.filter((c) => !filled.has(c.id))
  const picked = deceasedOnly ? empty.filter((c) => !!c.death_date) : empty
  // 사망자가 생존자보다 먼저다. 머리글에 생몰이 보이면 연표도 생부터 몰까지여야 한다.
  return picked
    .toSorted((a, b) => Number(!!b.death_date) - Number(!!a.death_date))
    .map((c) => c.slug)
}

/** 기존 연표 건수 구간으로 실존 인물을 고른다. 이미 개편한 명단은 --exclude-file로 뺀다. */
async function fetchExistingCelebSlugs(minEvents: number, maxEvents: number): Promise<string[]> {
  if (!Number.isInteger(minEvents) || minEvents < 1 || maxEvents < minEvents) {
    throw new Error(`사건 수 범위가 잘못됐다: ${minEvents}~${maxEvents}`)
  }
  const [celebs, events] = await Promise.all([
    fetchActiveRealCelebs(),
    fetchPages<{ celeb_id: string }>('celeb_timeline_events', 'id,celeb_id'),
  ])
  const counts = new Map<string, number>()
  for (const event of events) counts.set(event.celeb_id, (counts.get(event.celeb_id) ?? 0) + 1)
  return celebs
    .filter((celeb) => {
      const count = counts.get(celeb.id) ?? 0
      return count >= minEvents && count <= maxEvents
    })
    .toSorted((a, b) => Number(!!b.death_date) - Number(!!a.death_date) || a.slug.localeCompare(b.slug))
    .map((celeb) => celeb.slug)
}

main().catch((e) => { console.error(e); process.exit(1) })
