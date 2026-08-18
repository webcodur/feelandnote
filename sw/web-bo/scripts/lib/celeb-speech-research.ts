import { createHash } from 'node:crypto'

export const NO_VERIFIED_QUOTE_KO = '[확인된 어록이 없습니다]'
export const NO_VERIFIED_QUOTE_EN = '[No verified quote]'

/**
 * 대사 실행 규약의 SSoT. 문서는 이 상수를 가리키고 값을 복제하지 않는다.
 * 규칙의 뜻과 목표 범위는 `docs/project/celeb/celeb-speech.md` §6.3이 쥔다.
 */
export const SPEECH_SITUATIONS = [
  'greeting', 'roll_call', 'deploy', 'battle_win', 'battle_draw', 'battle_lose', 'clash_attack',
] as const

export type SpeechSituation = typeof SPEECH_SITUATIONS[number]

/** 한 상황당 대사 개수. 7상황 × 3개 = 21개. */
export const SPEECH_LINES_PER_SITUATION = 3

/** 표시용 한국어 한마디 상한. */
export const SPEECH_QUOTE_MAX_KO = 50

/**
 * 상황별 한국어 대사 상한. clash·deploy·roll_call·battle_* 는 룰북 실측값이고,
 * greeting 은 같은 한 호흡 반응으로 보아 battle_* 와 같은 상한을 적용한다.
 * 긴 직접 인용을 보존해야 하는 기존 greeting 은 신규 작성 대상이 아니므로 이 게이트를 타지 않는다.
 */
export const SPEECH_LINE_MAX_KO: Record<SpeechSituation, number> = {
  greeting: 40,
  roll_call: 40,
  deploy: 35,
  battle_win: 40,
  battle_draw: 40,
  battle_lose: 40,
  clash_attack: 25,
}

/** 문장 맨 앞의 ELE 발화 지시 태그. 길이를 셀 때 제외한다. */
const ELE_TAG = /^\s*\[[^\]]*\]\s*/

export function stripEleTag(line: string): string {
  return line.replace(ELE_TAG, '').trim()
}

/**
 * 한국어 21개 대사의 구조·길이·중복을 검사한다. 위반 목록을 돌려주며 비어 있으면 통과다.
 * `allowEleTag: false`(기본)는 신규 작성용이다. AI는 태그를 새로 붙이지 않는다.
 */
export function validateSpeechLinesKo(
  lines: Record<string, unknown>,
  options: { allowEleTag?: boolean } = {},
): string[] {
  const allowEleTag = options.allowEleTag ?? false
  const violations: string[] = []
  const all: string[] = []

  for (const situation of SPEECH_SITUATIONS) {
    const values = lines[situation]
    if (!Array.isArray(values) || values.length !== SPEECH_LINES_PER_SITUATION) {
      violations.push(`${situation}: 문자열 ${SPEECH_LINES_PER_SITUATION}개가 아니다`)
      continue
    }
    for (const value of values) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        violations.push(`${situation}: 빈 문자열이 있다`)
        continue
      }
      const hasTag = ELE_TAG.test(value)
      if (hasTag && !allowEleTag) violations.push(`${situation}: 발화 지시 태그를 새로 붙이지 않는다 | ${value}`)
      const body = stripEleTag(value)
      const max = SPEECH_LINE_MAX_KO[situation]
      if (body.length > max) violations.push(`${situation}: ${body.length}자 (상한 ${max}) | ${value}`)
      if (body.includes('—')) violations.push(`${situation}: 줄표는 쓰지 않는다 | ${value}`)
      all.push(body)
    }
  }

  if (new Set(all).size !== all.length) violations.push('21개 안에 같은 문장이 있다')
  return violations
}

const BLOCKED_QUOTE_HOSTS = [
  'brainyquote.com',
  'azquotes.com',
  'goodreads.com',
  'quotefancy.com',
]

export type SpeechResearch = {
  schemaVersion: 1
  identity: { summary: string; sourceUrl: string }
  representativeFacts: Array<{ fact: string; sourceUrl: string }>
  voiceSamples: Array<{
    original: string
    originalLanguage: string
    quoteKo: string
    quoteEn: string
    sourceUrl: string
  }>
  dialogueAnchors: string[]
  searchedChannels: string[]
  searchQueries: string[]
  inspectedSources: Array<{ sourceUrl: string; finding: string }>
  quoteOutcome: 'verified' | 'unavailable'
  unavailableReason?: string
  dialogueDecision: 'CREATE' | 'KEEP' | 'REVISE'
  dialogueAssessment: string
  expectedLinesSha256: string
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    )
  }
  return value
}

export function speechLinesSha256(lines: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonical(lines ?? {}))).digest('hex')
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${label}가 비었다`)
  return value.trim()
}

function url(value: unknown, label: string): string {
  const raw = text(value, label)
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(`${label}가 유효한 URL이 아니다: ${raw}`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${label}는 http(s) URL이어야 한다`)
  }
  return parsed.hostname.toLowerCase()
}

function uniqueTexts(values: unknown, label: string, minimum: number): string[] {
  if (!Array.isArray(values)) throw new Error(`${label}는 배열이어야 한다`)
  const result = [...new Set(values.map((value, index) => text(value, `${label}[${index}]`)))]
  if (result.length < minimum) throw new Error(`${label}는 서로 다른 값 ${minimum}개 이상이어야 한다`)
  return result
}

export function validateSpeechResearch(args: {
  research: SpeechResearch | undefined
  currentLines: unknown
  proposedQuoteKo: unknown
  proposedQuoteEn: unknown
  hasKoDialoguePatch: boolean
}): SpeechResearch {
  const research = args.research
  if (!research) throw new Error('한국어 한마디·상황 대사 반영에는 speech_research가 필요하다')
  if (research.schemaVersion !== 1) throw new Error('speech_research.schemaVersion은 1이어야 한다')

  text(research.identity?.summary, 'speech_research.identity.summary')
  url(research.identity?.sourceUrl, 'speech_research.identity.sourceUrl')

  if (!Array.isArray(research.representativeFacts) || research.representativeFacts.length < 2) {
    throw new Error('speech_research.representativeFacts는 출처가 있는 대표 정보 2개 이상이어야 한다')
  }
  research.representativeFacts.forEach((item, index) => {
    text(item?.fact, `speech_research.representativeFacts[${index}].fact`)
    url(item?.sourceUrl, `speech_research.representativeFacts[${index}].sourceUrl`)
  })

  uniqueTexts(research.dialogueAnchors, 'speech_research.dialogueAnchors', 3)
  uniqueTexts(research.searchedChannels, 'speech_research.searchedChannels', 2)
  uniqueTexts(research.searchQueries, 'speech_research.searchQueries', 3)
  if (!Array.isArray(research.inspectedSources) || research.inspectedSources.length < 2) {
    throw new Error('speech_research.inspectedSources는 실제로 열어 확인한 출처 2개 이상이어야 한다')
  }
  const inspectedHosts = new Set<string>()
  research.inspectedSources.forEach((source, index) => {
    inspectedHosts.add(url(source?.sourceUrl, `speech_research.inspectedSources[${index}].sourceUrl`))
    text(source?.finding, `speech_research.inspectedSources[${index}].finding`)
  })
  text(research.dialogueAssessment, 'speech_research.dialogueAssessment')

  if (!['CREATE', 'KEEP', 'REVISE'].includes(research.dialogueDecision)) {
    throw new Error('speech_research.dialogueDecision은 CREATE|KEEP|REVISE여야 한다')
  }
  if (!/^[a-f0-9]{64}$/.test(research.expectedLinesSha256)) {
    throw new Error('speech_research.expectedLinesSha256가 올바른 SHA-256이 아니다')
  }
  const currentHash = speechLinesSha256(args.currentLines)
  if (currentHash !== research.expectedLinesSha256) {
    throw new Error(`대사 현재값 해시가 달라졌다: expected=${research.expectedLinesSha256} actual=${currentHash}`)
  }
  if (research.dialogueDecision === 'KEEP' && args.hasKoDialoguePatch) {
    throw new Error('KEEP 판정은 기존 21개를 보내거나 덮어쓰지 않는다')
  }
  if ((research.dialogueDecision === 'CREATE' || research.dialogueDecision === 'REVISE') && !args.hasKoDialoguePatch) {
    throw new Error(`${research.dialogueDecision} 판정에는 한국어 21개 대사 완성본이 필요하다`)
  }

  const quoteKo = text(args.proposedQuoteKo, 'dialogues.lines.quote')
  const quoteEn = text(args.proposedQuoteEn, 'dialogues.lines_en.quote')
  if (quoteKo.includes('\n') || quoteEn.includes('\n')) throw new Error('한마디에는 줄바꿈을 넣지 않는다')
  if (quoteKo.length > SPEECH_QUOTE_MAX_KO) {
    throw new Error(`한국어 한마디가 ${SPEECH_QUOTE_MAX_KO}자를 넘는다: ${quoteKo.length}`)
  }

  if (research.quoteOutcome === 'verified') {
    if (!Array.isArray(research.voiceSamples) || research.voiceSamples.length < 1) {
      throw new Error('verified 한마디에는 직접 발화 표본이 1개 이상 필요하다')
    }
    let selected = false
    research.voiceSamples.forEach((sample, index) => {
      const original = text(sample?.original, `speech_research.voiceSamples[${index}].original`)
      const originalLanguage = text(
        sample?.originalLanguage,
        `speech_research.voiceSamples[${index}].originalLanguage`,
      ).toLowerCase()
      const ko = text(sample?.quoteKo, `speech_research.voiceSamples[${index}].quoteKo`)
      const en = text(sample?.quoteEn, `speech_research.voiceSamples[${index}].quoteEn`)
      const host = url(sample?.sourceUrl, `speech_research.voiceSamples[${index}].sourceUrl`)
      if (BLOCKED_QUOTE_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
        throw new Error(`명언 모음 사이트는 직접 발화의 단독 근거가 될 수 없다: ${host}`)
      }
      if ((originalLanguage === 'ko' || originalLanguage === 'ko-kr') && sample.original.trim() !== ko) {
        throw new Error('한국어 직접 발언은 종결·어순·내용을 다듬지 말고 quoteKo에 원문 그대로 써야 한다')
      }
      if (/^en(?:-|$)/.test(originalLanguage) && original !== en) {
        throw new Error('영어 직접 발언은 종결·어순·내용을 다듬지 말고 quoteEn에 원문 그대로 써야 한다')
      }
      if (ko === quoteKo && en === quoteEn) selected = true
    })
    if (!selected) throw new Error('적용할 한·영 한마디가 voiceSamples의 같은 표본과 일치하지 않는다')
    if (quoteKo === NO_VERIFIED_QUOTE_KO || quoteEn === NO_VERIFIED_QUOTE_EN) {
      throw new Error('verified 결과에 자리 표시 값을 쓸 수 없다')
    }
  } else if (research.quoteOutcome === 'unavailable') {
    if (quoteKo !== NO_VERIFIED_QUOTE_KO || quoteEn !== NO_VERIFIED_QUOTE_EN) {
      throw new Error('unavailable 결과는 표준 한·영 자리 표시 값을 함께 써야 한다')
    }
    if (Array.isArray(research.voiceSamples) && research.voiceSamples.length > 0) {
      throw new Error('직접 발화 표본이 있으면 unavailable로 판정할 수 없다')
    }
    text(research.unavailableReason, 'speech_research.unavailableReason')
    if (research.inspectedSources.length < 3 || inspectedHosts.size < 2) {
      throw new Error('unavailable은 실제로 연 출처 3개 이상·서로 다른 호스트 2개 이상이 필요하다')
    }
  } else {
    throw new Error('speech_research.quoteOutcome은 verified|unavailable이어야 한다')
  }

  return research
}
