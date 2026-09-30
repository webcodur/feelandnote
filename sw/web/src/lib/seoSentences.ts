/**
 * 검색 설명의 문장 단위 줄이기. 끝난 문장만 싣고 「…」로 자르지 않는다(26.09.29 유저 지시 — 「…」 남용 금지).
 * 작품 이름·인용 안의 마침표와 「…」는 원문 그대로 두므로, 괄호·따옴표 안이나 약어(no.·Dr.·U.S.) 뒤에서는 문장을 끊지 않는다.
 * 순수 함수라 인물 메타(lib/celeb/meta.ts)와 사이트 공통 요약(lib/seo.ts)이 함께 쓴다.
 */

const OPENERS = '《〈「『“‘(（['
const CLOSERS = '》〉」』”’)）]'
/** 마침표가 문장 끝이 아닌 영어 약어 — 뒤 낱말이 이어진다 */
const ABBREVIATION = /(?:^|[\s(])(?:no|nos|dr|mr|mrs|ms|st|mt|vs|inc|co|corp|ltd|jr|sr|vol|ed|eds|e\.g|i\.e|etc|approx|fig|u\.s|u\.k|[a-z])\.$/i

/** 문장 끝 부호 뒤 공백에서 나눈다. 괄호·따옴표가 열린 채이거나 약어 뒤면 잇는다. */
export function splitSentences(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (OPENERS.includes(char)) depth++
    else if (CLOSERS.includes(char)) depth = Math.max(0, depth - 1)
    if (depth > 0 || !/[.!?。]/.test(char) || !/\s/.test(text[i + 1] ?? '')) continue
    const sentence = text.slice(start, i + 1)
    if (char === '.' && ABBREVIATION.test(sentence)) continue
    out.push(sentence.trim())
    start = i + 1
  }
  const rest = text.slice(start).trim()
  if (rest) out.push(rest)
  return out.filter(Boolean)
}

/**
 * 한도 안에 통째로 드는 앞 문장까지만 잇는다. 첫 문장부터 넘치면 빈 문자열 — 부르는 쪽이 자기 머리 문장만 쓴다.
 * @param measure 길이 재는 법. 기본은 글자 수, 검색 결과 폭으로 재려면 폭 어림 함수를 넘긴다
 */
export function summarizeSentences(text: string, max: number, measure: (value: string) => number = (value) => value.length): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (measure(cleaned) <= max) return cleaned
  let summary = ''
  for (const sentence of splitSentences(cleaned)) {
    const next = summary ? `${summary} ${sentence}` : sentence
    if (measure(next) > max) break
    summary = next
  }
  return summary
}

/** 검색 결과 설명 두 줄(PC 600px, 14px 글자)의 폭을 한글 한 자 = 1로 어림한 값 */
export const SNIPPET_WIDTH = 84

/** 폭 어림 — 로마자·숫자는 한글의 절반 남짓, 띄어쓰기·문장부호는 1/3 정도다(제목 폭 어림과 같은 계수) */
export function estimateTextWidth(text: string): number {
  let width = 0
  for (const char of text) {
    if (/[A-Za-z0-9]/.test(char)) width += 0.55
    else if (/[\s.,:;·&'’()-]/.test(char)) width += 0.3
    else width += 1
  }
  return width
}

/** 머리 문장 뒤에 본문 문장을 검색 결과 두 줄에 드는 만큼만 잇는다. 한 문장도 안 들어가면 머리만 둔다 */
export function appendWithinSnippet(head: string, body: string | null | undefined, width = SNIPPET_WIDTH): string {
  const lead = head.trim()
  const room = width - estimateTextWidth(lead) - 0.3
  const summary = body ? summarizeSentences(body, room, estimateTextWidth) : ''
  return summary ? `${lead} ${summary}` : lead
}
