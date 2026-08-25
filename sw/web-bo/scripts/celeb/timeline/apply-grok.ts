/**
 * 그록 CLI로 인물 생애 연표(celeb_timeline_events)를 채우는 릴레이 관문.
 * 규칙 SSoT: docs/project/celeb/celeb-timeline-grok-relay.md, docs/project/celeb/celeb-timeline.md
 * (이 스크립트는 규칙을 복제하지 않는다. 그록에게 두 문서를 직접 읽게 한다.)
 *
 * 흐름: 조사(grok) → 의심(grok, 새 세션·출처 필수) → 수정(grok) → 구조 검사 → 대기열 → 사람 승인.
 * 의심자가 실제로 연 출처(sources)를 2곳 미만으로 적으면 검색을 안 한 것으로 보고 재시도한다.
 *
 * 이미 사건이 있는 인물은 덮어쓰지 않고 SKIPPED 처리한다. life(실존) 티어만 지원한다.
 *
 * 실행:
 *   pnpm exec tsx scripts/celeb/timeline/apply-grok.ts run --auto --deceased --total 35 --lanes 12 --stage
 *   pnpm exec tsx scripts/celeb/timeline/apply-grok.ts review   # 대기열을 읽고 판단
 *   pnpm exec tsx scripts/celeb/timeline/apply-grok.ts commit   # 승인분만 DB 반영
 */

import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { REPO_ROOT } from '../../lib/paths'
import { grokJson } from '../../../../../.agents/skills/grok-cli/scripts/grok-call.mjs'

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
/** 이보다 적으면 연표가 아니다. 자료가 없는 인물은 비워 두는 편이 낫다. */
const MIN_EVENTS = 3

type CandidateEvent = {
  year: number | null
  year_end: number | null
  title: string
  title_en: string
  description: string
  description_en: string
  kind: string
  place_name: string | null
  place_name_en: string | null
  lat: number | null
  lng: number | null
}

type Defect = { index: number; field: string; current_value: string; correct_value: string; evidence: string }

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
        required: ['title', 'title_en', 'description', 'description_en', 'kind'],
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
        required: ['name', 'used_for'],
      },
    },
  },
  required: ['defects', 'zero_defects_indices', 'sources'],
}

type GrokResult = {
  structuredOutput?: Record<string, unknown>
  usage: { reasoning_tokens?: number }
  num_turns?: number
}

/**
 * 호출 규약(셸 우회·비동기 spawn·effort·작업 폴더 격리)은 grok-cli 스킬의 헬퍼가 쥔다.
 * 여기서 다시 짜지 않는다. 왜 그렇게 부르는지는 그 스킬 문서에 근거와 함께 있다.
 */
async function runGrok(promptText: string, schema: object): Promise<GrokResult> {
  const { raw } = await grokJson(promptText, schema, { effort: 'high', repoRoot: REPO_ROOT })
  return raw as GrokResult
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
    `스타일을 그대로 따른다. 생애에서 중요한 사건 6~10개(출생 포함, 사망일이 있을 때만 사망도 포함)를`,
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
  const list = events
    .map((e, i) => `${i}. year=${e.year ?? 'null'} kind=${e.kind} title="${e.title}" place=${e.place_name ? `"${e.place_name}"` : 'null'} desc="${e.description}"`)
    .join('\n')
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
    list,
    ``,
    `각 index의 각 필드에 대해 무죄를 독립적으로 증명하지 못하면 결함으로 적어라(사건 id 대신 index를 써라).`,
    `모든 필드가 무죄로 확인된 index만 zero_defects_indices에 넣어라. 출력은 JSON 스키마만 따르는 순수 JSON.`,
    ``,
    `너는 사실만 판정한다. 최종 문장은 조사자가 쓴다. correct_value에는 완성된 서비스 문장이 아니라`,
    `무엇이 사실인지를 적어라. 확인이 안 되면 correct_value는 「비움」이다.`,
    `evidence에는 어느 출처가 그 값을 뒷받침하는지 적어라.`,
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
      // 타임아웃·일시 오류는 실패가 아니라 재시도 대상이다. 검증 없이 반영되는 일만 막으면 된다.
      say(`  의심자 ${attempt}회차 호출 실패(${(e as Error).message.slice(0, 120)}) — 재시도`)
      continue
    }
    const sources = (res.structuredOutput?.sources ?? []) as { name: string; used_for: string }[]
    if (sources.length >= MIN_SKEPTIC_SOURCES) {
      return {
        defects: (res.structuredOutput?.defects ?? []) as Defect[],
        sources: sources.length,
        attempt,
      }
    }
    say(`  의심자 ${attempt}회차 출처 ${sources.length}곳 — 검색 없이 답한 것으로 보아 재시도`)
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
    `**사건을 지우지 마라.** 결함은 대부분 「이 사건 안의 이 대목이 확인되지 않는다」는 뜻이지`,
    `「이 사건이 없었다」가 아니다. 확인되지 않은 대목은 그 문장에서 빼고 사건은 남긴다.`,
    `배열에서 사건을 빼도 되는 경우는 검증자가 그 사건 자체가 일어나지 않았다고 명시했을 때뿐이다.`,
    `입력이 ${events.length}건이면 출력도 원칙적으로 ${events.length}건이다.`,
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
  for (const [i, ev] of events.entries()) {
    if (!(ev.title ?? '').trim()) violations.push(`index=${i} 제목 없음`)
    if (!(ev.description ?? '').trim()) violations.push(`index=${i} 국문 서술 없음`)
    if (!(ev.description_en ?? '').trim()) violations.push(`index=${i} 영문 서술 없음`)
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

  const { count } = await supabase
    .from('celeb_timeline_events')
    .select('id', { count: 'exact', head: true })
    .eq('celeb_id', celeb.id)
  if ((count ?? 0) > 0) { say(`SKIPPED ${slug} — 이미 사건 ${count}건 있음`); return 'skipped' as const }

  say(`조사 시작: ${slug} (${celeb.nickname})`)
  // 자료가 넘치는 인물에서도 빈손으로 돌아오는 일이 있다. 자료 부족이 아니라 호출 문제이므로
  // 의심자와 같이 재시도로 회수한다.
  let events: CandidateEvent[] = []
  for (let attempt = 1; attempt <= 1 + MAX_RESEARCH_RETRIES; attempt++) {
    try {
      const res = await runGrok(researcherPrompt(celeb), RESEARCHER_SCHEMA)
      events = (res.structuredOutput?.events ?? []) as CandidateEvent[]
    } catch (e) {
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

  const skeptic = await runSkepticWithRetry(celeb, events, say)
  if (!skeptic) { say(`FAILED ${slug} — 의심자가 ${MAX_SKEPTIC_RETRIES + 1}회 모두 출처 없이 답함. 반영 보류`); return 'failed' as const }

  let kept = events
  if (skeptic.defects.length > 0) {
    for (const d of skeptic.defects) say(`  결함: index=${d.index} ${d.field} → ${d.correct_value}`)
    // 수정자가 「확인 안 됨」을 「없던 일」로 읽고 사건을 무더기로 지우는 일이 있다. 결함 수보다
    // 훨씬 많이 사라졌으면 수정이 아니라 사고이므로, 버리지 말고 다시 시킨다.
    const allowedLoss = Math.max(2, skeptic.defects.length)
    let accepted = false
    for (let attempt = 1; attempt <= 1 + MAX_FIX_RETRIES; attempt++) {
      let candidate: CandidateEvent[]
      try {
        const fixed = await runGrok(fixerPrompt(celeb, events, skeptic.defects), RESEARCHER_SCHEMA)
        candidate = (fixed.structuredOutput?.events ?? []) as CandidateEvent[]
      } catch (e) {
        say(`  수정 ${attempt}회차 호출 실패(${(e as Error).message.slice(0, 90)}) — 재시도`)
        continue
      }
      const lost = events.length - candidate.length
      if (candidate.length > 0 && lost <= allowedLoss) { kept = candidate; accepted = true; break }
      say(`  수정 ${attempt}회차 ${events.length}건 중 ${lost}건 소실(허용 ${allowedLoss}) — 재시도`)
    }
    if (!accepted) {
      say(`FAILED ${slug} — 수정 단계가 ${MAX_FIX_RETRIES + 1}회 모두 사건을 과하게 지웠다. 반영 보류`)
      return 'failed' as const
    }
    say(`  수정 완료: 결함 ${skeptic.defects.length}건 반영, ${events.length}건 → ${kept.length}건`)
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

  // 사건 한두 건짜리는 연표가 아니다. 자료가 없는 인물이거나 조사가 실패한 것이니 내지 않는다.
  if (kept.length < MIN_EVENTS) {
    say(`FAILED ${slug} — 사건 ${kept.length}건뿐이라 연표가 되지 않는다. 반영 보류`)
    return 'failed' as const
  }

  const tail = `결함 ${skeptic.defects.length}건 수정, 출처 ${skeptic.sources}곳 (의심자 ${skeptic.attempt}회차)`
  if (dry) { say(`DRY  ${slug} — ${kept.length}건, ${tail}`); return 'ok' as const }

  // 사실은 그록이 검증했다. 문장이 쓸만한지는 사람이 본다. 대기열에 놓고 승인 뒤에 넣는다.
  if (stageDir) {
    mkdirSync(stageDir, { recursive: true })
    const file = resolve(stageDir, `${slug}.json`)
    writeFileSync(file, JSON.stringify({ slug, celeb_id: celeb.id, events: kept }, null, 1), 'utf8')
    say(`STAGED ${slug} — ${kept.length}건 대기, ${tail}`)
    return 'ok' as const
  }

  const rows = kept.map((e, i) => ({ celeb_id: celeb.id, ...e, source: 'research', sort_order: (i + 1) * 10 }))
  const { data: inserted, error: insertError } = await supabase
    .from('celeb_timeline_events').insert(rows).select('id,title,description')
  if (insertError || !inserted) { say(`FAILED ${slug} — 삽입 실패: ${insertError?.message}`); return 'failed' as const }

  const { data: after } = await supabase
    .from('celeb_timeline_events').select('id,title,description').eq('celeb_id', celeb.id)
  const bad = inserted.filter((r) => {
    const found = after?.find((a) => a.id === r.id)
    return !found || found.title !== r.title || found.description !== r.description
  })
  if (bad.length) { say(`FAILED ${slug} — 왕복 검증 불일치 ${bad.length}건`); return 'failed' as const }

  say(`OK   ${slug} — ${inserted.length}건 저장, ${tail}`)
  return 'ok' as const
}

function argOf(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

/**
 * 5단계 검토용 출력. 한 사람의 연표를 위에서 아래로 읽어 그 사람이 지나온 길이 잡히는지 본다.
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
 * 반려는 파일을 지우면 된다. 사건이 이미 있는 인물은 넣지 않는다.
 */
async function commitStaged() {
  const dir = argOf('dir') ?? '.tmp-celeb-timeline-grok/staged'
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  if (files.length === 0) { console.log(`${dir} 에 승인 대기 파일이 없다.`); return }

  // 처리한 파일은 대기열 밖으로 옮긴다. 지우기만 하면 실패했을 때 조용히 남아 다음 검토에
  // 다시 섞이고, 이미 반영된 인물이 미검토분처럼 계측된다.
  const doneDir = resolve(dir, '..', 'applied')
  const heldDir = resolve(dir, '..', 'held')
  mkdirSync(doneDir, { recursive: true })
  mkdirSync(heldDir, { recursive: true })
  const move = (full: string, name: string, to: string) => {
    try { renameSync(full, resolve(to, name)) }
    catch { rmSync(full, { force: true }) }
  }
  const retire = (full: string, name: string) => move(full, name, doneDir)
  // --all 은 선별기를 끄고 전부 넣는다. 보류분을 사람이 읽고 통과시킬 때 쓴다.
  const screenOff = process.argv.includes('--all')
  let held = 0

  let ok = 0, skipped = 0, failed = 0
  for (const f of files) {
    const full = resolve(dir, f)
    const { slug, celeb_id, events } = JSON.parse(readFileSync(full, 'utf8')) as
      { slug: string; celeb_id: string; events: CandidateEvent[] }

    const { count } = await supabase
      .from('celeb_timeline_events').select('id', { count: 'exact', head: true }).eq('celeb_id', celeb_id)
    if ((count ?? 0) > 0) {
      console.log(`SKIPPED ${slug} — 이미 사건 ${count}건 있음`)
      retire(full, f)
      skipped++
      continue
    }

    const broken = inspectStructure(events)
    if (broken.length) { console.log(`FAILED ${slug} — 필수값 누락 ${broken.length}건`); failed++; continue }

    const flag = screenOff ? null : screenForReview(events)
    if (flag) {
      console.log(`HELD ${slug} — ${flag}. 사람이 읽을 것`)
      move(full, f, heldDir)
      held++
      continue
    }
    // 대기열 파일이 옛 규칙으로 만들어졌을 수 있다. 삽입 직전에 한 번 더 모양을 맞춘다.
    for (const n of [...enforcePlaceInvariants(events), ...enforceDateInvariants(events)]) console.log(`  ${slug} ${n}`)

    const rows = events.map((e, i) => ({ celeb_id, ...e, source: 'research', sort_order: (i + 1) * 10 }))
    const { data: inserted, error } = await supabase
      .from('celeb_timeline_events').insert(rows).select('id,title,description')
    if (error || !inserted) { console.log(`FAILED ${slug} — 삽입 실패: ${error?.message}`); failed++; continue }

    const { data: after } = await supabase
      .from('celeb_timeline_events').select('id,title,description').eq('celeb_id', celeb_id)
    const bad = inserted.filter((r) => {
      const got = after?.find((a) => a.id === r.id)
      return !got || got.title !== r.title || got.description !== r.description
    })
    if (bad.length) { console.log(`FAILED ${slug} — 왕복 검증 불일치 ${bad.length}건`); failed++; continue }

    retire(full, f)
    console.log(`OK   ${slug} — ${inserted.length}건 저장`)
    ok++
  }
  console.log(`\n## 반영 결과`)
  console.log(JSON.stringify({ ok, skipped, failed, held }))
  if (held > 0) console.log(`보류 ${held}건은 ${heldDir} 에 있다. 읽고 통과시키려면 그 폴더를 --dir 로 주고 --all 로 커밋한다.`)
  if (failed > 0) process.exit(1)
}

async function main() {
  if (process.argv[2] === 'review') { await reviewStaged(); return }
  if (process.argv[2] === 'commit') { await commitStaged(); return }
  if (process.argv[2] !== 'run') {
    console.error('사용법: run --auto [--total N] [--lanes N] [--stage] | run --slugs a,b [--stage] [--dry] | review | commit')
    process.exit(1)
  }
  const dry = process.argv.includes('--dry')
  // --stage 는 사람 승인을 거치는 기본 경로다. 생략하면 검증 통과 즉시 DB로 들어간다.
  const stageDir = process.argv.includes('--stage')
    ? resolve(argOf('dir') ?? '.tmp-celeb-timeline-grok/staged')
    : undefined
  let slugs = (argOf('slugs') ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  if (process.argv.includes('--auto')) {
    slugs = await fetchEmptyCelebSlugs(process.argv.includes('--deceased'))
    console.log(`연표가 빈 인물 ${slugs.length}명을 후보로 잡았다.`)
  }
  if (slugs.length === 0) throw new Error('--slugs 또는 --auto 가 필요하다')

  // --total 은 이번에 처리할 인원이다. 레인 수와 무관하며, 생략하면 후보 전부를 돈다.
  const totalArg = argOf('total') ?? argOf('limit')
  const total = totalArg ? Math.min(Number.parseInt(totalArg, 10), slugs.length) : slugs.length
  const lanes = Math.max(1, Number.parseInt(argOf('lanes') ?? argOf('concurrency') ?? String(DEFAULT_CONCURRENCY), 10))

  console.log(`레인 ${lanes}개로 ${total}명을 릴레이한다. 레인이 비면 즉시 다음 인물을 배정한다.\n`)

  let ok = 0, skipped = 0, failed = 0, started = 0, done = 0
  const queue = slugs.slice(0, total)

  /** 한 레인은 자기 대상을 끝내는 즉시 다음 대상을 집는다. 배치가 닫히길 기다리지 않는다. */
  const lane = async (laneNo: number) => {
    for (;;) {
      const slug = queue.shift()
      if (!slug) return
      const seq = ++started
      // 레인들이 동시에 찍으면 로그가 섞인다. 한 인물의 출력을 모아 한 번에 내보낸다.
      const lines: string[] = []
      const r = await processCeleb(slug, dry, stageDir, (m) => lines.push(m))
      done++
      console.log([`--- 레인${laneNo} [${seq}/${total}] ${slug} (완료 ${done}, 대기 ${queue.length})`, ...lines].join('\n'))
      if (r === 'ok') ok++
      else if (r === 'skipped') skipped++
      else failed++
    }
  }
  await Promise.all(Array.from({ length: Math.min(lanes, queue.length) }, (_, i) => lane(i + 1)))

  console.log(`\n## 결과 (${dry ? 'DRY-RUN' : 'APPLY'}) — 처리 ${total}명`)
  console.log(JSON.stringify({ ok, skipped, failed }))
}

/** 연표가 한 건도 없는 공개 실존 인물을 한 번에 모은다. 인물마다 count를 날리면 느리다. */
async function fetchEmptyCelebSlugs(deceasedOnly = false): Promise<string[]> {
  type PageFilter = {
    column: string
    operator: 'eq' | 'neq'
    value: string
  }
  const page = async <T>(table: string, cols: string, filters: readonly PageFilter[] = []): Promise<T[]> => {
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
  const celebs = await page<{ id: string; slug: string; death_date: string | null }>(
    'celebs',
    'id,slug,death_date',
    [
      { column: 'publication_status', operator: 'eq', value: 'active' },
      { column: 'celeb_tier', operator: 'neq', value: 'fiction' },
    ],
  )
  const events = await page<{ celeb_id: string }>('celeb_timeline_events', 'id,celeb_id')
  const filled = new Set(events.map((e) => e.celeb_id))
  const empty = celebs.filter((c) => !filled.has(c.id))
  const picked = deceasedOnly ? empty.filter((c) => !!c.death_date) : empty
  // 사망자가 생존자보다 먼저다. 머리글에 생몰이 보이면 연표도 생부터 몰까지여야 한다.
  return picked
    .toSorted((a, b) => Number(!!b.death_date) - Number(!!a.death_date))
    .map((c) => c.slug)
}

main().catch((e) => { console.error(e); process.exit(1) })
