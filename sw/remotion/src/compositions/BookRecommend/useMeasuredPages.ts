/**
 * DOM 실측 기반 텍스트 페이지 분할.
 *
 * 숨긴 div에 문장을 하나씩 쌓아 offsetHeight > maxHeight 이면 페이지를 분리.
 * DOM 측정 실패 시 CPL 추정 폴백.
 */
import { useMemo } from 'react'
import { splitSentences, paginateSentences } from './sentence-split'
import type { VoiceTimingSegment } from './types'

export type PageResult = {
  pages: string[]
  ranges: { startIdx: number; endIdx: number }[]
}

/** CPL 폴백용 상수 */
const FALLBACK_CPL_KO = 20
const FALLBACK_LH = 57 // 38 * 1.5

function measurePages(
  text: string,
  maxHeight: number,
  width: number,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  timings?: VoiceTimingSegment[],
): PageResult {
  const sentences = splitSentences(text, timings)

  if (sentences.length <= 1) {
    return { pages: [text], ranges: [{ startIdx: 0, endIdx: sentences.length }] }
  }

  // --- DOM 실측 ---
  try {
    const el = document.createElement('div')
    el.style.cssText = [
      'position:absolute',
      'visibility:hidden',
      `width:${width}px`,
      `font-size:${fontSize}px`,
      `line-height:${lineHeight}`,
      `font-family:${fontFamily}`,
      'white-space:pre-wrap',
      'margin:0',
      'padding:0',
      'border:none',
    ].join(';')

    // 진단: computed style + 문장별 누적 높이
    document.body.appendChild(el)
    el.textContent = 'test'
    const cs = window.getComputedStyle(el)
    console.log(`[useMeasuredPages] computed: w=${cs.width} fontSize=${cs.fontSize} lh=${cs.lineHeight} font=${cs.fontFamily.substring(0, 40)}`)
    console.log(`[useMeasuredPages] text="${text.substring(0, 60)}…" sentences=${sentences.length} maxH=${maxHeight} w=${width}`)
    const heights: number[] = []
    let acc = ''
    for (let i = 0; i < sentences.length; i++) {
      acc = acc ? acc + ' ' + sentences[i] : sentences[i]
      el.textContent = acc
      heights.push(el.offsetHeight)
    }
    console.log(`[useMeasuredPages] 문장별 누적높이:`, heights.map((h, i) => `[${i}]${h}`).join(' '))

    // 첫 문장 유효성
    if (heights[0] <= 0) {
      console.warn(`[useMeasuredPages] offsetHeight=0 — DOM 측정 실패, CPL 폴백`)
      document.body.removeChild(el)
    } else {
      // 문장 누적 측정 — 실제 페이지 분리
      const pages: string[] = []
      const ranges: { startIdx: number; endIdx: number }[] = []
      let page = ''
      let pageStart = 0

      for (let i = 0; i < sentences.length; i++) {
        const candidate = page ? page + ' ' + sentences[i] : sentences[i]
        el.textContent = candidate
        if (el.offsetHeight > maxHeight && page) {
          pages.push(page)
          ranges.push({ startIdx: pageStart, endIdx: i })
          page = sentences[i]
          pageStart = i
        } else {
          page = candidate
        }
      }
      if (page) {
        pages.push(page)
        ranges.push({ startIdx: pageStart, endIdx: sentences.length })
      }

      document.body.removeChild(el)

      if (pages.length > 0) {
        console.log(`[useMeasuredPages] → ${pages.length}페이지 분할`)
        return { pages, ranges }
      }
    }
  } catch (e) {
    console.warn('[useMeasuredPages] DOM 측정 예외:', e)
  }

  // --- 폴백: CPL 추정 ---
  const linesPerPage = Math.floor(maxHeight / FALLBACK_LH)
  const charsPerPage = linesPerPage * FALLBACK_CPL_KO
  console.log(`[useMeasuredPages] CPL 폴백: ${linesPerPage}줄 × ${FALLBACK_CPL_KO}자 = ${charsPerPage}자/페이지`)
  return paginateSentences(text, charsPerPage, timings)
}

/** 단일 텍스트 블록의 렌더 높이 실측 */
export function measureHeight(
  text: string | undefined,
  width: number,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  extraCss = '',
): number {
  if (!text) return 0
  const el = document.createElement('div')
  el.style.cssText = `position:absolute;visibility:hidden;width:${width}px;font-size:${fontSize}px;line-height:${lineHeight};font-family:${fontFamily};white-space:pre-wrap;margin:0;padding:0;border:none;${extraCss}`
  document.body.appendChild(el)
  el.textContent = text
  const h = el.offsetHeight
  document.body.removeChild(el)
  return h
}

export function useMeasuredPages(
  text: string,
  maxHeight: number,
  width: number,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  timings?: VoiceTimingSegment[],
): PageResult {
  return useMemo(
    () => measurePages(text, maxHeight, width, fontSize, lineHeight, fontFamily, timings),
    [text, maxHeight, width, fontSize, lineHeight, fontFamily, timings],
  )
}
