import type { VoiceTimingSegment } from './types'

const stripPunct = (s: string) => s.replace(/[\s.,!?“"”'’《》\n\r]/g, '')

/**
 * 세그먼트 텍스트 내 anchor 텍스트의 시작 시각(초)을 매칭한다.
 * 매칭 우선순위: sub-level → word-level → sentence-level → 텍스트 위치 비율 폴백.
 *
 * @returns segment 시작 기준 상대 초. 매칭 실패 시 null.
 */
export function resolveAnchorTime(opts: {
  anchorText: string
  segText: string
  segDurSec: number
  timings?: VoiceTimingSegment[]
}): number | null {
  const normAnchor = stripPunct(opts.anchorText)
  if (!normAnchor) return null

  const timings = opts.timings

  // 1순위: sub-level
  if (timings && timings.length > 0) {
    let subFullText = ''
    const subPositions: { offset: number; start: number }[] = []
    for (const sen of timings) {
      const subs = (sen.sub ?? []) as string[]
      const subT = (sen.subTimings ?? []) as number[]
      if (subs.length === 0) {
        subPositions.push({ offset: subFullText.length, start: sen.start })
        subFullText += stripPunct(sen.text ?? '')
        continue
      }
      for (let si = 0; si < subs.length; si++) {
        const subStart = si === 0 ? sen.start : subT[si - 1]
        subPositions.push({ offset: subFullText.length, start: subStart })
        subFullText += stripPunct(subs[si])
      }
    }
    if (subPositions.length > 0) {
      const pos = subFullText.indexOf(normAnchor)
      if (pos !== -1) {
        for (let j = subPositions.length - 1; j >= 0; j--) {
          if (pos >= subPositions[j].offset) return subPositions[j].start
        }
      }
    }
  }

  // 2순위: word-level
  if (timings && timings.length > 0) {
    let wordFullText = ''
    const wordPositions: { offset: number; start: number }[] = []
    for (const sen of timings) {
      if (!sen.words) continue
      for (const w of sen.words) {
        if (!w.text) continue
        wordPositions.push({ offset: wordFullText.length, start: w.start })
        wordFullText += stripPunct(w.text)
      }
    }
    if (wordPositions.length > 0) {
      const pos = wordFullText.indexOf(normAnchor)
      if (pos !== -1) {
        for (let j = wordPositions.length - 1; j >= 0; j--) {
          if (pos >= wordPositions[j].offset) return wordPositions[j].start
        }
      }
    }
  }

  // 3순위: sentence-level
  if (timings && timings.length > 0) {
    let fullText = ''
    const positions: { offset: number; start: number }[] = []
    for (const w of timings) {
      if (!w.text) continue
      positions.push({ offset: fullText.length, start: w.start })
      fullText += stripPunct(w.text)
    }
    if (positions.length > 0) {
      const pos = fullText.indexOf(normAnchor)
      if (pos !== -1) {
        for (let j = positions.length - 1; j >= 0; j--) {
          if (pos >= positions[j].offset) return positions[j].start
        }
      }
    }
  }

  // 4순위: 세그먼트 텍스트 내 위치 비율 폴백
  const normSegText = stripPunct(opts.segText)
  if (normSegText.length > 0) {
    const pos = normSegText.indexOf(normAnchor)
    if (pos !== -1) return (pos / normSegText.length) * opts.segDurSec
  }

  return null
}
