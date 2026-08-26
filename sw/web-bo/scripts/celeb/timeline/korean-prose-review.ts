import { codexCall } from '../../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'
import { REPO_ROOT } from '../../lib/paths'

export type TimelineEventForKoreanReview = {
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
  [key: string]: unknown
}

export type KoreanProseIssue = {
  index: number
  fields: Array<'title' | 'description'>
  problem: string
}

export type KoreanFactCheck = {
  index: number
  reason: string
}

export type KoreanProseReview = {
  status: 'pass' | 'revised' | 'fact_check' | 'research_needed'
  summary: string
  issues: KoreanProseIssue[]
  fact_check: KoreanFactCheck[]
  research_needed_reason: string | null
  changed_indices: number[]
  events: TimelineEventForKoreanReview[]
}

export type TimelineFactReviewContext = {
  defects?: Array<{
    index: number
    field: string
    current_value: string
    correct_value: string
    evidence: string
  }>
  checks?: Array<{
    index: number
    evidence: string
    source_urls?: string[]
  }>
}

type ReviewPayload = {
  status: 'pass' | 'revised' | 'fact_check' | 'research_needed'
  summary: string
  issues: KoreanProseIssue[]
  fact_check: KoreanFactCheck[]
  research_needed_reason: string | null
  events: Array<{ index: number; title: string; description: string }>
}

const TIMELINE_DOC = `${REPO_ROOT}/docs/project/celeb/celeb-timeline.md`
const MAX_CONCURRENT_REVIEWS = 3
let runningReviews = 0
const waiters: Array<() => void> = []

async function withReviewSlot<T>(work: () => Promise<T>): Promise<T> {
  if (runningReviews >= MAX_CONCURRENT_REVIEWS) {
    await new Promise<void>((resolve) => waiters.push(resolve))
  }
  runningReviews++
  try {
    return await work()
  } finally {
    runningReviews--
    waiters.shift()?.()
  }
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim()
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')
  if (start < 0 || end < start) throw new Error('한국어 편집자가 JSON 객체를 반환하지 않았다')
  return JSON.parse(unfenced.slice(start, end + 1))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseKoreanProseReview(raw: string, eventCount: number): ReviewPayload {
  const parsed = extractJson(raw)
  if (!isRecord(parsed)) throw new Error('한국어 편집 결과가 객체가 아니다')
  if (!['pass', 'revised', 'fact_check', 'research_needed'].includes(String(parsed.status))) {
    throw new Error(`한국어 편집 status가 잘못됐다: ${String(parsed.status)}`)
  }
  if (typeof parsed.summary !== 'string') throw new Error('한국어 편집 summary가 없다')
  if (!Array.isArray(parsed.events) || parsed.events.length !== eventCount) {
    throw new Error(`한국어 편집 사건 수가 달라졌다: ${Array.isArray(parsed.events) ? parsed.events.length : '없음'} / ${eventCount}`)
  }

  const indices = new Set<number>()
  const events = parsed.events.map((value, order) => {
    if (!isRecord(value)) throw new Error(`한국어 편집 events[${order}]가 객체가 아니다`)
    const index = Number(value.index)
    if (!Number.isInteger(index) || index < 0 || index >= eventCount || indices.has(index)) {
      throw new Error(`한국어 편집 index가 잘못됐다: ${String(value.index)}`)
    }
    if (typeof value.title !== 'string' || !value.title.trim()) throw new Error(`index=${index} 제목이 비었다`)
    if (typeof value.description !== 'string' || !value.description.trim()) throw new Error(`index=${index} 서술이 비었다`)
    indices.add(index)
    return { index, title: value.title.trim(), description: value.description.trim() }
  }).sort((a, b) => a.index - b.index)

  const issues = Array.isArray(parsed.issues) ? parsed.issues.map((value, order) => {
    if (!isRecord(value)) throw new Error(`한국어 편집 issues[${order}]가 객체가 아니다`)
    const index = Number(value.index)
    const fields = Array.isArray(value.fields)
      ? value.fields.filter((field): field is 'title' | 'description' => field === 'title' || field === 'description')
      : []
    if (!Number.isInteger(index) || index < 0 || index >= eventCount || fields.length === 0 || typeof value.problem !== 'string') {
      throw new Error(`한국어 편집 issues[${order}] 형식이 잘못됐다`)
    }
    return { index, fields, problem: value.problem }
  }) : []

  const factCheck = Array.isArray(parsed.fact_check) ? parsed.fact_check.map((value, order) => {
    if (!isRecord(value)) throw new Error(`한국어 편집 fact_check[${order}]가 객체가 아니다`)
    const index = Number(value.index)
    if (!Number.isInteger(index) || index < 0 || index >= eventCount || typeof value.reason !== 'string' || !value.reason.trim()) {
      throw new Error(`한국어 편집 fact_check[${order}] 형식이 잘못됐다`)
    }
    return { index, reason: value.reason.trim() }
  }) : []

  if (parsed.status === 'fact_check' && factCheck.length === 0) {
    throw new Error('fact_check 판정인데 확인할 대목이 적히지 않았다')
  }
  const researchNeededReason = typeof parsed.research_needed_reason === 'string' && parsed.research_needed_reason.trim()
    ? parsed.research_needed_reason.trim()
    : null
  if (parsed.status === 'research_needed' && !researchNeededReason) {
    throw new Error('research_needed 판정인데 재조사 이유가 적히지 않았다')
  }

  return {
    status: parsed.status as ReviewPayload['status'],
    summary: parsed.summary,
    issues,
    fact_check: factCheck,
    research_needed_reason: researchNeededReason,
    events,
  }
}

export function applyKoreanProseReview(
  original: TimelineEventForKoreanReview[],
  review: ReviewPayload,
): KoreanProseReview {
  const changedIndices: number[] = []
  const events = original.map((event, index) => {
    const edited = review.events[index]
    if (edited.title !== event.title || edited.description !== event.description) changedIndices.push(index)
    // 편집자는 이 두 국문 필드만 바꿀 수 있다. 모델이 다른 값을 출력할 자리 자체를 주지 않는다.
    return { ...event, title: edited.title, description: edited.description }
  })

  let status = review.status
  if (status !== 'fact_check' && status !== 'research_needed') status = changedIndices.length > 0 ? 'revised' : 'pass'
  return {
    status,
    summary: review.summary,
    issues: review.issues,
    fact_check: review.fact_check,
    research_needed_reason: review.research_needed_reason,
    changed_indices: changedIndices,
    events,
  }
}

export function buildKoreanReviewerPrompt(
  celeb: { slug: string; nickname: string },
  events: TimelineEventForKoreanReview[],
  factReview?: TimelineFactReviewContext,
): string {
  const compact = events.map((event, index) => ({
    index,
    year: event.year,
    year_end: event.year_end,
    kind: event.kind,
    place_name: event.place_name,
    title: event.title,
    title_en: event.title_en,
    description: event.description,
    description_en: event.description_en,
  }))
  const audit = factReview ? events.map((_, index) => ({
    index,
    evidence: factReview.checks?.find((check) => check.index === index)?.evidence ?? null,
    corrected_defects: (factReview.defects ?? [])
      .filter((defect) => defect.index === index)
      .map((defect) => ({
        field: defect.field,
        correct_value: defect.correct_value,
        evidence: defect.evidence,
      })),
  })) : null
  return [
    `너는 인물 연표의 독립 한국어 편집자다. 웹 검색과 사실 조사는 하지 않는다.`,
    `대상은 ${celeb.nickname} (${celeb.slug})이다.`,
    `현행 기준은 ${TIMELINE_DOC}의 「서술 쓰기」다.`,
    ``,
    `국문 title·description을 영문 title_en·description_en과 사건별로 대조한 뒤, 사건 전체를 처음부터`,
    `끝까지 이어 읽어라. 다음 결함을 놓치지 마라.`,
    `- 영문 단어를 순서대로 치환해 한국어의 주어·목적어·행동 관계가 무너짐`,
    `- 「스페인에 사 년을 두었다」「같은 인물을 했다」「워쇼스키 앞에 세웠다」처럼 뜻을 짐작해야 함`,
    `- 앞 문장만으로 대상을 알 수 없는 「그 도시」「그 인물」「그 대사」`,
    `- 배역을 「하다」라고 쓰거나 film went to video를 「비디오로 가는 영화」처럼 옮긴 직역`,
    `- 사건별 문장은 이해되지만 위에서 아래로 읽을 때 생애의 연결이 끊김`,
    ``,
    `고칠 수 있는 필드는 국문 title과 description뿐이다. 영문은 의미의 상한선이다. 영문이 말하지 않은`,
    `평가·인과·성장·성과를 보태지 마라. started acting again을 「연기 활동을 다시 시작했다」로 옮길 수는`,
    `있지만 「연기 폭을 넓혔다」로 확장하면 안 된다. 세부를 요약해서 없애지 말고 자연스러운 한국어로`,
    `보존한다. 이미 자연스러운 문장은 그대로 둔다.`,
    ``,
    `영문 자체가 모호하거나 국문과 영문 중 어느 쪽이 사실인지 판단해야 고칠 수 있으면 추측하지 말고`,
    `status를 fact_check로 하고 해당 index와 이유를 fact_check에 적는다. 안전하게 고칠 수 있는 다른`,
    `문장은 고쳐도 된다.`,
    ``,
    ...(audit ? [
      `아래 입력 뒤에는 독립 웹 감사에서 확인한 사건별 근거와, 수정자에게 전달된 결함도 붙는다. 이 기록을`,
      `새 사실을 창작하는 재료로 쓰지 말고 수정 결과를 대조하는 기준으로만 써라. 최종 event의 연도·영문·`,
      `국문이 감사 근거와 다시 충돌하면 문장을 매끄럽게 덮지 말고 fact_check로 보류한다. 특히 year나`,
      `year_end가 바뀐 사건의 「그해」「이듬해」「그 전해」가 새 연도와 맞는지 확인한다. 출처마다 다른`,
      `사소한 횟수·수치를 한 문장에 나열해 모순을 전시하지 말고, 확정할 수 없는 세부를 영문이 계속`,
      `주장하면 fact_check로 돌린다. 국문만 안전하게 덜어낼 수 있더라도 국영문 의미가 달라지면 보류한다.`,
      ``,
    ] : []),
    `문장들을 고쳐도 사건 선택의 큰 공백, 생애 전환의 누락, 앞뒤 연결 단절 때문에 이 사람의 삶이`,
    `읽히지 않으면 연결 문장을 지어내지 마라. status를 research_needed로 하고 왜 사건을 다시 조사해야`,
    `하는지 research_needed_reason에 적는다. 안전하게 고칠 수 있는 문장은 고쳐도 된다.`,
    ``,
    `출력은 아래 모양의 JSON 객체 하나뿐이다. 코드펜스와 설명문을 붙이지 마라. events는 입력과 같은`,
    `개수로 모든 index를 한 번씩 넣고, 최종 국문 title·description만 쓴다.`,
    `{`,
    `  "status": "pass | revised | fact_check | research_needed",`,
    `  "summary": "전체 판정 한두 문장",`,
    `  "issues": [{"index": 0, "fields": ["title", "description"], "problem": "무엇이 왜 이상했는지"}],`,
    `  "fact_check": [{"index": 0, "reason": "왜 문장 편집만으로 확정할 수 없는지"}],`,
    `  "research_needed_reason": null,`,
    `  "events": [{"index": 0, "title": "최종 국문 제목", "description": "최종 국문 서술"}]`,
    `}`,
    ``,
    `입력:`,
    JSON.stringify(compact, null, 1),
    ...(audit ? [
      ``,
      `독립 사실 감사 기록:`,
      JSON.stringify(audit, null, 1),
    ] : []),
  ].join('\n')
}

export async function reviewKoreanTimeline(
  celeb: { slug: string; nickname: string },
  events: TimelineEventForKoreanReview[],
  factReview?: TimelineFactReviewContext,
): Promise<KoreanProseReview> {
  return withReviewSlot(async () => {
    const raw = await codexCall(buildKoreanReviewerPrompt(celeb, events, factReview), {
      model: 'gpt-5.6-sol',
      effort: 'medium',
      timeoutMs: 300_000,
    })
    return applyKoreanProseReview(events, parseKoreanProseReview(raw, events.length))
  })
}
