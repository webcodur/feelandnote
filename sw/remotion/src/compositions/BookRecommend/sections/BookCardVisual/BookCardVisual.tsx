/**
 * BookCardVisual — 도서 소개 비주얼
 *
 * 1열 하단 텍스트: overflow:hidden 박스 + translateY 스크롤.
 * 오디오 진행률에 따라 콘텐츠가 위로 밀려올라가며,
 * 섹션 라벨(핵심요약/감상경위)은 상단 고정.
 */
import React, { useRef, useState, useLayoutEffect } from 'react'
import { Img, interpolate, useCurrentFrame } from 'remotion'
import type { BookEntry, CelebHost, VoiceTimingSegment, ImageTransition } from '../../types'
import { DARK_BG } from '../../../theme'
import { Typewriter } from '../Typewriter'
import { SectionLabel, SECTION_LABEL_H } from './PaginatedSection'
import { BookCardHero } from './BookCardHero'
import { CinematicPanel } from './CinematicPanel'
import { FONT } from '../../fonts'
import {
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP, f,
} from '../../timing'
import { safeImg, useIsPortrait, CELEB_VOICE_COLOR, CELEB_VOICE_HIGHLIGHT, CELEB_VOICE_BORDER, CELEB_VOICE_PADDING_LEFT, expandSubTimings, sliceOriginalByTimings, isTimingsStale } from '../../utils'
import { MetaCategoryIcon, getCategoryAccent } from './CategoryBadge'
import { vnBookSummary, vnBookContext, vnBookQuote, vnBookAfter, vnTimingKey } from '../../voice-names'
import type { QuotePairTiming } from '../../useTimeline'
import type { BookRecommendScript } from '../../types'
import { t } from '../../i18n'

const CLAMP = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

// ── 텍스트 앵커 → 프레임 해석 ──

type SectionEntry = { key: string; baseFrame: number; field: string; origText: string | undefined }

/** 섹션의 세그먼트를 미리 파싱한 구조 */
type ParsedSection = {
  baseFrame: number
  positions: { offset: number; seg: VoiceTimingSegment }[]
  fullText: string
}

/** 섹션 세그먼트를 파싱하여 캐싱용 구조 반환.
 *  원고(`origText`)를 expanded sub 단위로 slice하여 fullText를 구성한다.
 *  seg.text/seg.sub는 Whisper STT 오인식이 있을 수 있어 이미지 앵커 indexOf 매칭이 실패한다
 *  (예: "갑오년" → "가보년", "계사년" → "개사년", "읊으면서도" → "잃투면서도").
 *  원고 slice로 구성하면 앵커를 원고 그대로 쓸 수 있다. */
function parseSection(
  timings: Record<string, VoiceTimingSegment[]>,
  entry: SectionEntry,
): ParsedSection | null {
  const segs = timings[entry.key]
  if (!segs) return null

  // 원고가 없거나 stale한 timing이면 seg.text 폴백
  const origText = entry.origText
  const fresh = origText && !isTimingsStale(origText, segs) ? segs : undefined
  const expanded = fresh ? expandSubTimings(fresh) : undefined
  const useOrig = origText && expanded && expanded.length > 0
    && expanded.every(t => t.start != null && t.end != null)

  let offset = 0
  const positions: { offset: number; seg: VoiceTimingSegment }[] = []
  let fullText = ''

  if (useOrig) {
    // 원고를 expanded sub 수에 맞춰 slice하고, 각 slice의 norm 텍스트로 fullText 구성
    const slices = sliceOriginalByTimings(origText!, expanded!)
    for (let i = 0; i < expanded!.length; i++) {
      const t = expanded![i]
      const sliceText = slices[i] ?? ''
      positions.push({ offset, seg: { start: t.start!, end: t.end!, text: sliceText } })
      const normText = sliceText.replace(/[\s.,!?“"”'’\n\r]/g, '')
      fullText += normText
      offset += normText.length
    }
  } else {
    // 폴백: 기존 seg.text/sub 기반 (원고 없을 때)
    for (const seg of segs) {
      if (!seg.text) continue
      if (seg.sub && seg.subTimings && seg.sub.length > 1) {
        for (let si = 0; si < seg.sub.length; si++) {
          const subStart = si === 0 ? seg.start : (seg.subTimings[si - 1] ?? seg.start)
          const subEnd = si < seg.subTimings.length ? seg.subTimings[si] : seg.end
          positions.push({ offset, seg: { start: subStart, end: subEnd, text: seg.sub[si] } })
          const normText = seg.sub[si].replace(/[\s.,!?“"”'’\n\r]/g, '')
          fullText += normText
          offset += normText.length
        }
      } else {
        positions.push({ offset, seg })
        const normText = seg.text.replace(/[\s.,!?“"”'’\n\r]/g, '')
        fullText += normText
        offset += normText.length
      }
    }
  }
  return { baseFrame: entry.baseFrame, positions, fullText }
}

/** 텍스트 위치 비율로 프레임 추정 (voiceTimings 없을 때 폴백)
 *  occurrenceIndex(0-based)번째 등장 위치를 사용한다. */
function estimateAnchorFrame(
  anchor: string,
  sectionText: string | undefined,
  baseFrame: number,
  sectionFrames: number,
  occurrenceIndex: number,
): number {
  if (!sectionText) return -1
  const normText = sectionText.replace(/[\s.,!?“"”'’\n\r]/g, '')
  const normAnchor = anchor.replace(/[\s.,!?“"”'’\n\r]/g, '')
  if (!normAnchor) return -1

  let pos = -1
  let from = 0
  for (let i = 0; i <= occurrenceIndex; i++) {
    pos = normText.indexOf(normAnchor, from)
    if (pos === -1) return -1
    from = pos + 1
  }
  return baseFrame + Math.round((pos / Math.max(1, normText.length)) * sectionFrames)
}

/** fullText 내에서 anchor의 occurrenceIndex(0-based)번째 등장 세그먼트 시작 프레임 반환.
 *  같은 앵커 단어가 본문에 여러 번 나오면 작성 순서대로 N번째 등장 위치에 자동 매핑된다.
 *  N번째 등장이 없으면 -1. */
function findAnchorInSection(
  anchor: string,
  section: ParsedSection,
  occurrenceIndex: number,
): number {
  const normAnchor = anchor.replace(/[\s.,!?“"”'’\n\r]/g, '')
  if (!normAnchor) return -1

  // occurrenceIndex번째 등장 위치 찾기
  let pos = -1
  let from = 0
  for (let i = 0; i <= occurrenceIndex; i++) {
    pos = section.fullText.indexOf(normAnchor, from)
    if (pos === -1) return -1
    from = pos + 1  // 1글자씩 진행 (overlap 허용, "트로이트로이" 같은 케이스 대응)
  }

  for (let i = section.positions.length - 1; i >= 0; i--) {
    if (pos >= section.positions[i].offset) {
      return section.baseFrame + f(section.positions[i].seg.start)
    }
  }
  return -1
}

/** book.images 텍스트 앵커를 프레임으로 해석
 *
 * voiceTimings 있음: findAnchorInSection으로 정확한 단어 시작 프레임 매칭
 * voiceTimings 없음: estimateAnchorFrame으로 (텍스트위치/전체길이)×섹션프레임 비율 추정
 *
 * 매칭 실패 시 조용한 폴백 금지. 해당 이미지는 transitions에서 제외되고,
 * CinematicPanel은 이전 transition의 이미지를 그대로 유지한다.
 */
function resolveImageTransitions(
  book: BookEntry,
  bookIndex: number,
  timings: Record<string, VoiceTimingSegment[]> | undefined,
  sSummary: number,
  sContext: number,
  summaryFrames: number,
  contextFrames: number,
  qpTimings: QuotePairTiming[],
  pairStarts: Array<{ sQuote: number; sAfter: number }>,
): ImageTransition[] | undefined {
  if (!book.images?.length) return undefined

  const sectionEntries: SectionEntry[] = [
    { key: vnTimingKey(vnBookSummary(bookIndex)), baseFrame: sSummary, field: 'summary', origText: book.summary },
    { key: vnTimingKey(vnBookContext(bookIndex)), baseFrame: sContext, field: 'context', origText: book.contextMain },
  ]
  for (let pi = 0; pi < qpTimings.length; pi++) {
    const ps = pairStarts[pi]
    const pair = book.quotePairs?.[pi]
    if (qpTimings[pi].hasQuote) {
      sectionEntries.push({ key: vnTimingKey(vnBookQuote(bookIndex, pi)), baseFrame: ps.sQuote, field: 'quote', origText: pair?.quote })
    }
    if (qpTimings[pi].hasAfter) {
      sectionEntries.push({ key: vnTimingKey(vnBookAfter(bookIndex, pi)), baseFrame: ps.sAfter, field: 'quote', origText: pair?.after })
    }
  }

  // 섹션별 파싱 캐시 — 동일 field에 여러 섹션이 붙을 수 있으므로 배열로 관리
  const parsedMulti = new Map<string, ParsedSection[]>()
  const baseFrames: Record<string, number> = {}
  const quoteAfterText = (book.quotePairs ?? []).flatMap(p => [p.quote, p.after].filter(Boolean)).join('\n')
  // 레거시 데이터 대응: quote 이미지를 context로 저장해둔 경우를 위한 fallback 텍스트(폴백 추정용)
  const allCtxText = [book.contextMain, quoteAfterText].filter(Boolean).join('\n')
  const sectionTexts: Record<string, string | undefined> = {
    summary: book.summary,
    context: allCtxText || undefined,
    quote: quoteAfterText || undefined,
  }
  const totalQuoteFrames = qpTimings.reduce((sum, pt) => sum + pt.quoteFrames, 0)
  const totalAfterFrames = qpTimings.reduce((sum, pt) => sum + pt.afterFrames, 0)
  const sectionFrameMap: Record<string, number> = {
    summary: summaryFrames,
    context: contextFrames + totalQuoteFrames + totalAfterFrames,
    quote: totalQuoteFrames + totalAfterFrames,
  }
  // field별 폴백 순서 — 기본 필드 매칭 실패 시 시도할 대체 필드 (레거시 호환)
  const FIELD_FALLBACK: Record<string, string[]> = { quote: ['context'], context: ['quote'] }
  for (const entry of sectionEntries) {
    if (!(entry.field in baseFrames)) baseFrames[entry.field] = entry.baseFrame
    if (timings) {
      const p = parseSection(timings, entry)
      if (p) {
        const arr = parsedMulti.get(entry.field) ?? []
        arr.push(p)
        parsedMulti.set(entry.field, arr)
      }
    }
  }

  // occurrence-aware matching: `${field}::${anchor}` → 등장 누적 카운트
  // 같은 단어가 본문에 N번 나오면 작성 순서대로 N번째 위치에 자동 매핑
  const occurrenceCounter = new Map<string, number>()

  const result: ImageTransition[] = []
  for (let i = 0; i < book.images.length; i++) {
    const img = book.images[i]
    const primaryField = img.field ?? (i === 0 ? 'summary' : 'context')
    const fieldsToTry = [primaryField, ...(FIELD_FALLBACK[primaryField] ?? [])]

    // text 없음 → 스킵. 이전 이미지가 그대로 유지된다.
    if (!img.text) {
      if (typeof window !== 'undefined') {
        console.warn(`[ImageAnchor] text 앵커 누락 → 스킵 (${img.file})`)
      }
      continue
    }

    let frame = -1

    for (const field of fieldsToTry) {
      const sections = parsedMulti.get(field)
      const occKey = `${field}::${img.text}`
      const occIdx = occurrenceCounter.get(occKey) ?? 0

      if (sections && sections.length > 0) {
        for (const section of sections) {
          frame = findAnchorInSection(img.text, section, occIdx)
          if (frame !== -1) break
        }
        if (frame !== -1) {
          occurrenceCounter.set(occKey, occIdx + 1)
          break
        }
      } else {
        // voiceTimings 없음 — 텍스트 위치 비율로 프레임 추정 (Studio 미리보기용)
        const estimated = estimateAnchorFrame(
          img.text, sectionTexts[field],
          baseFrames[field] ?? 0, sectionFrameMap[field] ?? 0,
          occIdx,
        )
        if (estimated !== -1) {
          occurrenceCounter.set(occKey, occIdx + 1)
          frame = estimated
          break
        }
      }
    }

    if (frame === -1) {
      if (typeof window !== 'undefined') {
        console.warn(`[ImageAnchor] "${img.text}" 매칭 실패 (field=${primaryField}) → 스킵 (${img.file})`)
      }
      continue
    }

    result.push({ frame, file: img.file, keyword: img.keyword })
  }

  // 프레임 오름차순 정렬 보장
  result.sort((a, b) => a.frame - b.frame)

  return result
}

/** 시네마틱 레이아웃 공통 좌우 패딩 */
export const CINEM_PAD = 50

/** 돌판 하단 바 높이 비율 — 유튜브 타임라인 커버 (~54px at 1080p) */
export const STONE_BAR_H = '3%'

type Props = {
  book: BookEntry
  host: CelebHost
  index: number
  totalFrames: number
  titleFrames: number
  summaryFrames: number
  summaryEnd: number
  contextFrames: number
  contextEnd: number
  quotePairTimings: QuotePairTiming[]
  labelSummaryF: number
  labelContextF: number
  titleSummaryGapF: number
  summaryContextGapF: number
  episodeName: string
  timings?: Record<string, VoiceTimingSegment[]>
  script: BookRecommendScript
}

export const BookCardVisual: React.FC<Props> = ({
  book, host, index, totalFrames, titleFrames, summaryFrames, summaryEnd,
  contextFrames, contextEnd, quotePairTimings,
  labelSummaryF, labelContextF, titleSummaryGapF, summaryContextGapF, episodeName, timings, script,
}) => {
  const i18n = t(script)
  const frame = useCurrentFrame()
  const portrait = useIsPortrait()
  const accent = getCategoryAccent(book.category ?? 'BOOK')

  // --- 레이아웃 상수 ---
  const BODY_LH = 1.5
  const SQ_POSTER_H = portrait ? 200 : 260
  const CANVAS_H = portrait ? 1920 : 1080
  const PAD_TOP = portrait ? 60 : 80
  const PAD_BOTTOM = portrait ? 60 : 72
  const VISIBLE_H_CALC = CANVAS_H - PAD_TOP - PAD_BOTTOM - SQ_POSTER_H - 32 * 2 - 1 - SECTION_LABEL_H // 폴백용
  const BODY_FONT = portrait ? 34 : 38

  // --- 타이밍 ---
  const summaryAllTimings = timings?.[vnTimingKey(vnBookSummary(index))]
  const contextAllTimings = timings?.[vnTimingKey(vnBookContext(index))]

  // --- refs ---
  const summaryContentRef = useRef<HTMLDivElement>(null)
  const contextContentRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null) // overflow:hidden 컨테이너 실측용

  // DOM 측정값 캐시 — 매 프레임 scrollHeight/clientHeight를 읽으면
  // 강제 레이아웃 리플로우가 발생하여 2배속 재생 시 오디오 찝힘 유발.
  // 텍스트·레이아웃이 변하지 않는 한 한 번만 측정.
  const [measuredH, setMeasuredH] = useState(0)
  const [summaryH, setSummaryH] = useState(0)
  const [contextH, setContextH] = useState(0)
  const [geom, setGeom] = useState<Record<string, { top: number, height: number }>>({})
  // bodyOp > 0 이전에는 textContent가 렌더되지 않아 ref가 null → 측정 불가.
  // bodyVisible을 의존성에 넣어 DOM이 나타나는 시점에 재측정.
  const bodyVisible = frame > titleFrames + titleSummaryGapF - f(0.67)
  useLayoutEffect(() => {
    if (!bodyVisible) return

    let observer: ResizeObserver | null = null

    const measure = () => {
      const h = viewportRef.current?.clientHeight ?? 0
      if (h > 0 && h !== measuredH) setMeasuredH(h)
      const sh = summaryContentRef.current?.scrollHeight ?? 0
      if (sh > 0) setSummaryH(sh)
      const ch = contextContentRef.current?.scrollHeight ?? 0
      if (ch > 0) setContextH(ch)

      const newGeom: Record<string, { top: number, height: number }> = {}
      if (summaryContentRef.current) {
        const sum = summaryContentRef.current.querySelector('[data-id="summary"]') as HTMLElement
        if (sum) newGeom.summary = { top: sum.offsetTop, height: sum.offsetHeight }
      }
      if (contextContentRef.current) {
        const ids = ['context']
        for (let pi = 0; pi < quotePairTimings.length; pi++) {
          ids.push(`quote-${pi}`, `after-${pi}`)
        }
        ids.forEach(id => {
          const el = contextContentRef.current!.querySelector(`[data-id="${id}"]`) as HTMLElement
          if (el) newGeom[id] = { top: el.offsetTop, height: el.offsetHeight }
        })
      }

      setGeom(prev => {
        const prevStr = JSON.stringify(prev)
        const newStr = JSON.stringify(newGeom)
        return prevStr === newStr ? prev : newGeom
      })
    }

    measure()

    observer = new ResizeObserver(() => {
      measure()
    })

    if (viewportRef.current) observer.observe(viewportRef.current)
    if (summaryContentRef.current) observer.observe(summaryContentRef.current)
    if (contextContentRef.current) observer.observe(contextContentRef.current)

    return () => {
      observer?.disconnect()
    }
  }, [bodyVisible, portrait, book.summary, book.contextMain, book.quotePairs, quotePairTimings])
  const VISIBLE_H = measuredH > 0 ? measuredH : VISIBLE_H_CALC

  const isSquare = true

  if (frame < 0 || frame > totalFrames) return null

  // --- 페이즈 경계 (Series 오디오 배치와 완전 일치) ---
  const sLabelSummary = titleFrames + titleSummaryGapF
  const sSummary = sLabelSummary + labelSummaryF
  const sSummaryEnd = sSummary + summaryFrames
  const sLabelContext = sSummaryEnd + summaryContextGapF
  const sContext = sLabelContext + labelContextF
  const sContextEnd = sContext + contextFrames

  // quotePairs 동적 시작 프레임 계산
  const pairStarts: Array<{ sQuote: number; sAfter: number }> = []
  {
    let cursor = sContextEnd
    for (const pt of quotePairTimings) {
      const sQ = pt.hasQuote ? cursor + CONTEXT_QUOTE_GAP : cursor
      const quoteEnd = sQ + pt.quoteFrames
      const sA = pt.hasAfter ? quoteEnd + QUOTE_CONTEXTAFTER_GAP : quoteEnd
      pairStarts.push({ sQuote: sQ, sAfter: sA })
      cursor = sA + pt.afterFrames
    }
  }

  // --- 이미지 전환 (텍스트 앵커 해석) ---
  const imageTransitions = React.useMemo(() => {
    return resolveImageTransitions(book, index, timings, sSummary, sContext, summaryFrames, contextFrames, quotePairTimings, pairStarts)
  }, [book, index, timings, sSummary, sContext, summaryFrames, contextFrames, quotePairTimings, pairStarts])

  // --- 공통 ---
  const fadeOut = interpolate(frame, [totalFrames - f(1), totalFrames], [1, 0], CLAMP)

  // --- 본문 레이아웃 등장 ---
  const bodyOp = interpolate(frame,
    [sLabelSummary - f(0.67), sLabelSummary],
    [0, 1], CLAMP)

  // 포스터 등장 (본문 페이즈)
  const posterOp = interpolate(frame, [sLabelSummary - f(0.33), sLabelSummary + f(0.5)], [0, 1], CLAMP)
  const posterY = interpolate(frame, [sLabelSummary - f(0.33), sLabelSummary + f(0.5)], [20, 0], CLAMP)

  // --- 레이블·본문 opacity ---
  const summaryLabelOp = interpolate(frame,
    [sLabelSummary, sLabelSummary + f(0.5), sLabelContext, sLabelContext + f(0.5)],
    [0, 1, 1, 0], CLAMP)
  const summaryBodyOp = interpolate(frame,
    [sLabelSummary, sLabelSummary + f(0.5), sLabelContext, sLabelContext + f(0.5)],
    [0, 1, 1, 0], CLAMP)
  const contextLabelOp = interpolate(frame, [sLabelContext, sLabelContext + f(0.5)], [0, 1], CLAMP)
  const contextBodyOp = interpolate(frame, [sLabelContext, sLabelContext + f(0.5)], [0, 1], CLAMP)
  const quoteOpacities = pairStarts.map((ps, pi) =>
    quotePairTimings[pi].hasQuote
      ? interpolate(frame, [ps.sQuote, ps.sQuote + f(0.5)], [0, 1], CLAMP)
      : 1
  )
  const afterOpacities = pairStarts.map((ps, pi) =>
    quotePairTimings[pi].hasAfter
      ? interpolate(frame, [ps.sAfter, ps.sAfter + f(0.5)], [0, 1], CLAMP)
      : 1
  )

  // --- 스크롤: 나레이션이 하단 근접 시 몇 줄씩 밀어올림 ---
  // 나레이션 위치가 바닥 3줄 이내에 도달하면 STEP만큼 밀어서 상단 2줄 위치로 복귀.
  // 그 외엔 텍스트 정지. 읽는 동안 흔들림 없음.
  const LINE_H = BODY_FONT * BODY_LH // 51(portrait) or 57(landscape)
  const TOP_PAD = LINE_H * 2    // 114 — 밀린 뒤 나레이션이 위에서 2줄 위치
  const BTM_PAD = LINE_H * 3    // 171 — 나레이션이 아래 3줄에 닿으면 밀기
  const rawStep = VISIBLE_H - BTM_PAD - TOP_PAD
  const STEP = Math.max(LINE_H, Math.floor(rawStep / LINE_H) * LINE_H) // LINE_H 배수로 정렬
  const FLIP = f(0.4)

  const scrollPiecewise = (totalH: number, segments: { s: number, e: number, top: number, height: number, timings?: VoiceTimingSegment[] }[]) => {
    if (totalH <= VISIBLE_H || segments.length === 0) return 0
    const maxScroll = totalH - VISIBLE_H

    let readPos = 0
    if (frame <= segments[0].s) readPos = segments[0].top
    else {
      let found = false
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        if (frame >= seg.s && frame <= seg.e) {
          let progress = (frame - seg.s) / Math.max(1, seg.e - seg.s)
          if (seg.timings && seg.timings.length > 0) {
            const elapsed = frame - seg.s
            let totalChars = 0
            let readChars = 0
            let isReading = false
            for (const t of seg.timings) {
              const len = t.text ? t.text.length : 0
              totalChars += len
              const t0 = f(t.start)
              const t1 = f(t.end)
              if (!isReading) {
                if (elapsed >= t1) {
                  readChars += len
                } else if (elapsed >= t0) {
                  readChars += len * ((elapsed - t0) / Math.max(1, t1 - t0))
                  isReading = true
                } else {
                  isReading = true // gap between words
                }
              }
            }
            if (totalChars > 0) progress = readChars / totalChars
          }
          readPos = seg.top + seg.height * progress
          found = true
          break
        }
        if (i < segments.length - 1 && frame > seg.e && frame < segments[i+1].s) {
          readPos = seg.top + seg.height
          found = true
          break
        }
      }
      if (!found) {
        const last = segments[segments.length - 1]
        readPos = last.top + last.height
      }
    }

    const needed = Math.max(0, readPos - TOP_PAD)
    const stepIdx = Math.floor(needed / STEP)
    const target = Math.min(stepIdx * STEP, maxScroll)
    const prev = Math.min(Math.max(0, (stepIdx - 1) * STEP), maxScroll)

    const triggerPos = stepIdx * STEP + TOP_PAD
    let triggerFrame = -1
    for (const seg of segments) {
      if (triggerPos >= seg.top && triggerPos <= seg.top + seg.height) {
        let tProgress = (triggerPos - seg.top) / Math.max(1, seg.height)
        if (seg.timings && seg.timings.length > 0) {
          let totalChars = 0
          for (const t of seg.timings) totalChars += (t.text ? t.text.length : 0)
          let targetChars = tProgress * totalChars
          let curChars = 0
          for (const t of seg.timings) {
            const len = t.text ? t.text.length : 0
            if (curChars + len >= targetChars) {
              const frac = len > 0 ? (targetChars - curChars) / len : 0
              triggerFrame = seg.s + f(t.start) + frac * (f(t.end) - f(t.start))
              break
            }
            curChars += len
          }
          if (triggerFrame === -1) triggerFrame = seg.e
        } else {
          triggerFrame = seg.s + tProgress * (seg.e - seg.s)
        }
        break
      }
    }
    if (triggerFrame === -1) {
      for (let i = 0; i < segments.length - 1; i++) {
        const segEnd = segments[i].top + segments[i].height
        const nextStart = segments[i+1].top
        if (triggerPos > segEnd && triggerPos < nextStart) {
          triggerFrame = segments[i].e
          break
        }
      }
      if (triggerFrame === -1) triggerFrame = segments[0].s
    }

    return interpolate(frame, [triggerFrame, triggerFrame + FLIP], [prev, target], CLAMP)
  }

  const sumSegs = geom.summary ? [{ s: sSummary, e: sSummaryEnd, top: geom.summary.top, height: geom.summary.height, timings: summaryAllTimings }] : []
  const summaryScrollY = scrollPiecewise(summaryH, sumSegs)

  const ctxSegs: { s: number; e: number; top: number; height: number; timings?: VoiceTimingSegment[] }[] = []
  if (geom.context) ctxSegs.push({ s: sContext, e: sContextEnd, top: geom.context.top, height: geom.context.height, timings: contextAllTimings })
  for (let pi = 0; pi < quotePairTimings.length; pi++) {
    const pt = quotePairTimings[pi]
    const ps = pairStarts[pi]
    const qGeom = geom[`quote-${pi}`]
    const aGeom = geom[`after-${pi}`]
    if (pt.hasQuote && qGeom) ctxSegs.push({ s: ps.sQuote, e: ps.sQuote + pt.quoteFrames, top: qGeom.top, height: qGeom.height, timings: timings?.[vnTimingKey(vnBookQuote(index, pi))] })
    if (pt.hasAfter && aGeom) ctxSegs.push({ s: ps.sAfter, e: ps.sAfter + pt.afterFrames, top: aGeom.top, height: aGeom.height, timings: timings?.[vnTimingKey(vnBookAfter(index, pi))] })
  }
  
  const contextScrollY = scrollPiecewise(contextH, ctxSegs)

  const sqTextH = VISIBLE_H_CALC + SECTION_LABEL_H

  // ==================== 텍스트 블록 ====================
  // inset:0 + flex column → SectionLabel이 자연 높이를 차지하고, 나머지를 overflow 컨테이너가 채움.
  // 이렇게 하면 SectionLabel 실제 높이와 무관하게 overflow 영역이 정확히 남은 공간을 채운다.
  const summaryBlock = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <SectionLabel label={i18n.labelSummary} opacity={summaryLabelOp} />
      <div ref={viewportRef} style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        maskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
      }}>
        <div ref={summaryContentRef} style={{
          opacity: summaryBodyOp,
          transform: `translateY(-${summaryScrollY}px)`,
          fontFamily: FONT.sans,
          paddingBottom: BTM_PAD,
        }}>
          <div data-id="summary">
            <Typewriter text={book.summary} startFrame={sSummary} spreadFrames={summaryFrames - f(0.5)}
              color="#d0d0d0" fontSize={BODY_FONT} style={{ lineHeight: BODY_LH }}
              timings={summaryAllTimings} />
          </div>
        </div>
      </div>
    </div>
  )

  const contextBlock = (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <SectionLabel label={i18n.labelContext} opacity={contextLabelOp} />
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        maskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 88%, transparent 100%)',
      }}>
        <div ref={contextContentRef} style={{
          opacity: contextBodyOp,
          transform: `translateY(-${contextScrollY}px)`,
          fontFamily: FONT.sans,
          paddingBottom: BTM_PAD,
        }}>
          {/* 감상경위 본문 */}
          <div data-id="context">
            <Typewriter text={book.contextMain} startFrame={sContext} spreadFrames={contextFrames - f(0.5)}
              color="#bbb" fontSize={BODY_FONT} style={{ lineHeight: BODY_LH }}
              timings={contextAllTimings} />
          </div>

          {/* 인용+후속맥락 쌍 (동적 N개) */}
          {quotePairTimings.map((pt, pi) => {
            const ps = pairStarts[pi]
            const pair = book.quotePairs?.[pi]
            return (
              <React.Fragment key={`qp-${pi}`}>
                {pt.hasQuote && pair?.quote && (
                  <div data-id={`quote-${pi}`} style={{
                    opacity: quoteOpacities[pi], marginTop: 40,
                    borderLeft: CELEB_VOICE_BORDER, paddingLeft: CELEB_VOICE_PADDING_LEFT,
                  }}>
                    <Typewriter text={pair.quote} startFrame={ps.sQuote} spreadFrames={pt.quoteFrames - f(0.5)}
                      color={CELEB_VOICE_COLOR} highlightColor={CELEB_VOICE_HIGHLIGHT}
                      fontSize={BODY_FONT} style={{ fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.5 }}
                      timings={timings?.[vnTimingKey(vnBookQuote(index, pi))]} />
                    {pair.quoteSource && (
                      <div style={{ color: '#888', fontSize: 22, fontFamily: FONT.sans, marginTop: 4 }}>
                        — {host.nickname}, {pair.quoteSource}
                      </div>
                    )}
                    {!pair.quoteSource && (
                      <div style={{ color: '#888', fontSize: 22, fontFamily: FONT.sans, marginTop: 4 }}>
                        — {host.nickname}
                      </div>
                    )}
                  </div>
                )}
                {pt.hasAfter && pair?.after && (
                  <div data-id={`after-${pi}`} style={{ opacity: afterOpacities[pi], marginTop: 40, fontFamily: FONT.sans }}>
                    <Typewriter text={pair.after} startFrame={ps.sAfter} spreadFrames={pt.afterFrames - f(0.5)}
                      color="#bbb" fontSize={BODY_FONT} style={{ lineHeight: BODY_LH }}
                      timings={timings?.[vnTimingKey(vnBookAfter(index, pi))]} />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )

  const textContent = (
    <div style={{ position: 'relative', height: '100%' }}>
      {summaryBlock}
      {contextBlock}
    </div>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>

      {/* 배경 */}
      <div style={{ position: 'absolute', inset: 0, background: DARK_BG.radial }} />

      <BookCardHero book={book} locale={script.locale} publishYearLabel={i18n.publishYear} sLabelSummary={sLabelSummary} />

      {/* ===== 본문: 와이드 레이아웃 (1행 비주얼 / 2행 텍스트) ===== */}
      {bodyOp > 0 && !isSquare && (
        <div style={{ position: 'absolute', inset: 0, opacity: bodyOp, zIndex: 10, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: '75%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: `80px ${CINEM_PAD}px 12px`, gap: 20 }}>
            <div style={{ flexShrink: 0, height: '100%', opacity: posterOp, transform: `translateY(${posterY}px)` }}>
              <div style={{
                height: '100%', aspectRatio: '2 / 3', borderRadius: 10, overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(200,164,110,0.08)',
              }}>
                <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
            <div style={{ height: '100%', aspectRatio: '16 / 9', opacity: posterOp }}>
              <CinematicPanel episodeName={episodeName} book={book} sLabelContext={sLabelContext} imageTransitions={imageTransitions} />
            </div>
          </div>
          <div style={{ flex: 1, position: 'relative', padding: `12px ${CINEM_PAD}px 0` }}>
            <div style={{ width: '100%', height: '100%' }}>
              {textContent}
            </div>
          </div>
        </div>
      )}

      {/* ===== 본문: 정사각형 레이아웃 (1열: 책정보+본문 / 2열: 이미지 꽉참) ===== */}
      {bodyOp > 0 && isSquare && (
        <div style={{
          position: 'absolute', inset: 0, opacity: bodyOp, zIndex: 10,
          display: 'flex',
          padding: portrait ? `${PAD_TOP}px 40px ${PAD_BOTTOM}px` : `${PAD_TOP}px ${CINEM_PAD}px ${PAD_BOTTOM}px`,
          gap: portrait ? 16 : 24,
        }}>
          {/* 세로 모드: CinematicPanel 배경 — 인용구 구간만 어둡게, 기본은 원본 */}
          {portrait && (() => {
            // 인용구 구간 여부를 프레임 기반으로 직접 판별 (quoteOp는 가로용 폴백값이라 사용 불가)
            const quoteActive = pairStarts.reduce((max, ps, pi) => {
              if (!quotePairTimings[pi].hasQuote) return max
              const v = interpolate(frame, [ps.sQuote, ps.sQuote + f(0.5), ps.sQuote + quotePairTimings[pi].quoteFrames - f(0.5), ps.sQuote + quotePairTimings[pi].quoteFrames], [0, 1, 1, 0], CLAMP)
              return Math.max(max, v)
            }, 0)
            const bright = interpolate(quoteActive, [0, 1], [1, 0.35], CLAMP)
            const sat = interpolate(quoteActive, [0, 1], [1, 0.6], CLAMP)
            return (
              <div style={{
                position: 'absolute', inset: 0, opacity: posterOp,
                filter: `brightness(${bright}) saturate(${sat})`,
              }}>
                <CinematicPanel episodeName={episodeName} book={book} sLabelContext={sLabelContext} imageTransitions={imageTransitions} />
              </div>
            )
          })()}
          {/* 1열: 책정보+본문 (가로) / 쇼츠풍 배경+인용구 (세로) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: portrait ? 24 : 32, position: 'relative', zIndex: 1 }}>
            {/* ���스터+메타+구분선+본문 — 가로 전용 (세로�� BookCardHero + 자막으로 대체) */}
            {!portrait && (
              <>
                <div style={{ flexShrink: 0, display: 'flex', gap: 20, opacity: posterOp, transform: `translateY(${posterY}px)` }}>
                  <div style={{
                    height: SQ_POSTER_H, aspectRatio: '2 / 3', borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 24px rgba(200,164,110,0.06)',
                  }}>
                    <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    position: 'relative', paddingLeft: 12,
                  }}>
                    <div style={{
                      position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 140, fontWeight: 900, color: 'rgba(200,164,110,0.05)',
                      fontFamily: FONT.serif, lineHeight: 1, letterSpacing: -6,
                    }}>
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 700, color: '#e0d5c0', fontFamily: FONT.serif, lineHeight: 1.2 }}>
                      {book.title}
                    </div>
                    {book.stats.originalTitle && book.stats.originalTitle !== book.title && (
                      <div style={{ fontSize: 20, color: '#665d4e', fontFamily: FONT.sans, fontStyle: 'italic', marginTop: 4 }}>
                        {book.stats.originalTitle}
                      </div>
                    )}
                    <div style={{ margin: '12px 0' }} />
                    <div style={{ fontSize: 26, color: '#a09080', fontFamily: FONT.sans, fontWeight: 500 }}>
                      {book.creator}
                    </div>
                    <div style={{ fontSize: 18, color: '#5a5248', fontFamily: FONT.sans, marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MetaCategoryIcon category={book.category ?? 'BOOK'} />
                      {book.stats.publishYear && <><span style={{ color: accent.line }}>|</span><span style={{ letterSpacing: 1 }}>{book.stats.publishYear}</span></>}
                      {book.stats.publisher && <><span style={{ color: accent.line }}>|</span><span>{book.stats.publisher}</span></>}
                    </div>
                  </div>
                </div>
                <div style={{
                  flexShrink: 0, height: 1, opacity: posterOp,
                  background: `linear-gradient(90deg, transparent, ${accent.line} 20%, ${accent.line} 80%, transparent)`,
                }} />
                <div style={{ height: sqTextH, position: 'relative', flexShrink: 0 }}>
                  {textContent}
                </div>
              </>
            )}
          </div>

          {/* portrait: 인용구 전용 표시 — 인용구 읽는 구간에만 표시 */}
          {portrait && quotePairTimings.map((pt, pi) => {
            if (!pt.hasQuote) return null
            const pair = book.quotePairs?.[pi]
            if (!pair?.quote) return null
            const ps = pairStarts[pi]
            const pqOp = interpolate(frame,
              [ps.sQuote, ps.sQuote + f(0.5), ps.sQuote + pt.quoteFrames - f(0.5), ps.sQuote + pt.quoteFrames],
              [0, 1, 1, 0], CLAMP)
            if (pqOp <= 0) return null
            return (
            <div key={`pq-${pi}`} style={{
              position: 'absolute', inset: 0, zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 64px',
              opacity: pqOp,
            }}>
              <div style={{
                maxWidth: 780,
                borderLeft: '4px solid rgba(200,164,110,0.4)',
                paddingLeft: 24,
              }}>
                <Typewriter
                  text={pair.quote}
                  startFrame={ps.sQuote}
                  spreadFrames={pt.quoteFrames - f(0.5)}
                  color={CELEB_VOICE_COLOR}
                  highlightColor={CELEB_VOICE_HIGHLIGHT}
                  fontSize={54}
                  style={{ fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.7, wordBreak: 'keep-all' }}
                  timings={timings?.[vnTimingKey(vnBookQuote(index, pi))]}
                />
                <div style={{ color: '#888', fontSize: 24, fontFamily: FONT.sans, marginTop: 12 }}>
                  — {host.nickname}{pair.quoteSource ? `, ${pair.quoteSource}` : ''}
                </div>
              </div>
            </div>
            )
          })}
          {/* 2열: 배경연출 (1:1, 세로 꽉참) — 가로 모드 전용 */}
          {!portrait && (
            <div style={{ flexShrink: 0, height: '100%', aspectRatio: '1 / 1', opacity: posterOp, position: 'relative' }}>
              <CinematicPanel episodeName={episodeName} book={book} sLabelContext={sLabelContext} imageTransitions={imageTransitions} />
            </div>
          )}
        </div>
      )}

    </div>
  )
}
