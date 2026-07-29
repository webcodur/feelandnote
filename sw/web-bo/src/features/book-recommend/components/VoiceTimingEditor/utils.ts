import type { Timing } from './types'

/** 텍스트를 시간 비율 기준으로 두 조각으로 분할 — 단어 경계 존중 */
export function splitTextAtRatio(text: string, ratio: number): [string, string] {
  const words = text.split(/\s+/)
  if (words.length <= 1) return [text, '']
  const splitIdx = Math.max(1, Math.round(words.length * ratio))
  return [words.slice(0, splitIdx).join(' '), words.slice(splitIdx).join(' ')]
}

/**
 * 문장 묶음을 타이밍 구간에 재배분.
 * · 문장 수 == 타이밍 수면 1:1 그대로
 * · 아니면 각 구간 길이 비율대로 단어를 순서대로 분배 (마지막 구간이 잔여 단어 흡수)
 */
export function redistributeByDuration(sentences: string[], timings: Timing[]): string[] {
  if (sentences.length === timings.length) return [...sentences]
  const fullText = sentences.join(' ')
  const words = fullText.split(/\s+/)
  const totalDur = timings.reduce((s, t) => s + (t.end - t.start), 0)
  if (totalDur <= 0) return timings.map(() => '')
  const result: string[] = []
  let wi = 0
  for (let i = 0; i < timings.length; i++) {
    const ratio = (timings[i].end - timings[i].start) / totalDur
    const wc = i === timings.length - 1 ? words.length - wi : Math.max(1, Math.round(words.length * ratio))
    result.push(words.slice(wi, wi + wc).join(' '))
    wi += wc
  }
  return result
}
