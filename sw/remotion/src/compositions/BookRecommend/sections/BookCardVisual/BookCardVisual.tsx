/**
 * BookCardVisual — 도서 소개 비주얼 (단순형)
 *
 * 가로(16:9): 중앙 큰 이미지(화면 가득) + 좌상단 작은 표지. 본문 텍스트는
 *   하단 자막(LongSubtitles, BookRecommendLong에서 전역 렌더)이 담당한다.
 * 세로(portrait): 기존 유지 — 배경 이미지 + 인용구 오버레이.
 * 도입부(BookCardHero: 큰 표지 + 제목/저자 소개)는 양쪽 공통으로 유지한다.
 */
import React from 'react'
import { Img, interpolate, useCurrentFrame } from 'remotion'
import type { BookEntry, CelebHost, VoiceTimingSegment, ImageTransition } from '../../types'
import { DARK_BG } from '../../../theme'
import { Typewriter } from '../Typewriter'
import { BookCardHero } from './BookCardHero'
import { CinematicPanel } from './CinematicPanel'
import { FONT } from '../../fonts'
import { CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP, f } from '../../timing'
import { safeImg, useIsPortrait, CELEB_VOICE_COLOR, CELEB_VOICE_HIGHLIGHT, expandSubTimings, sliceOriginalByTimings, isTimingsStale } from '../../utils'
import { vnBookSummary, vnBookContext, vnBookQuote, vnBookAfter, vnTimingKey } from '../../voice-names'
import type { QuotePairTiming } from '../../useTimeline'
import type { BookRecommendScript } from '../../types'
import { t } from '../../i18n'

const CLAMP = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

// ── 텍스트 앵커 → 프레임 해석 (이미지 전환 타이밍) ──

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

/** 가로 롱폼 하단 자막 전용 띠 높이 (px @1080) — 이미지 영역은 이 위까지만 채운다 */
export const CAPTION_BAND_H = 210

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
  book, host, index, totalFrames, titleFrames, summaryFrames,
  contextFrames, quotePairTimings,
  labelSummaryF, labelContextF, titleSummaryGapF, summaryContextGapF, episodeName, timings, script,
}) => {
  const i18n = t(script)
  const frame = useCurrentFrame()
  const portrait = useIsPortrait()

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

  // --- 본문 레이아웃 등장 (제목 페이즈 → 본론 전환) ---
  const bodyOp = interpolate(frame,
    [sLabelSummary - f(0.67), sLabelSummary],
    [0, 1], CLAMP)

  // 표지·이미지 등장
  const posterOp = interpolate(frame, [sLabelSummary - f(0.33), sLabelSummary + f(0.5)], [0, 1], CLAMP)
  const posterY = interpolate(frame, [sLabelSummary - f(0.33), sLabelSummary + f(0.5)], [16, 0], CLAMP)

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>

      {/* 배경 */}
      <div style={{ position: 'absolute', inset: 0, background: DARK_BG.radial }} />

      {/* 도입부: 큰 표지 + 제목/저자 소개 (양쪽 공통) */}
      <BookCardHero book={book} locale={script.locale} publishYearLabel={i18n.publishYear} sLabelSummary={sLabelSummary} />

      {/* ===== 본론: 가로(16:9) — 중앙 큰 이미지 + 좌상단 작은 표지 ===== */}
      {bodyOp > 0 && !portrait && (
        <div style={{ position: 'absolute', inset: 0, opacity: bodyOp, zIndex: 10 }}>
          {/* 중앙 큰 이미지 (안 잘리게 contain, 좌우 여백은 흐린 배경으로 채움) — 자막 띠 위까지만 */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: CAPTION_BAND_H, opacity: posterOp }}>
            <CinematicPanel episodeName={episodeName} book={book} sLabelContext={sLabelContext} imageTransitions={imageTransitions} fullBleed fit="contain" />
          </div>

          {/* 상단 그라디언트 — 좌상단 표지/제목 가독성 */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '24%', background: 'linear-gradient(to bottom, rgba(8,7,5,0.72), transparent)', pointerEvents: 'none' }} />

          {/* 하단 자막 전용 띠 — 이미지와 분리된 고정 영역 */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: CAPTION_BAND_H,
            background: 'linear-gradient(to top, rgba(6,5,4,0.97) 55%, rgba(6,5,4,0.85) 80%, transparent)',
            pointerEvents: 'none',
          }} />

          {/* 좌상단 작은 표지 + 제목/저자 — 상단 설명 바(Breadcrumb) 아래로 내림 */}
          <div style={{
            position: 'absolute', top: 116, left: CINEM_PAD,
            display: 'flex', gap: 18, alignItems: 'flex-start',
            opacity: posterOp, transform: `translateY(${posterY}px)`,
          }}>
            <div style={{
              width: 132, aspectRatio: '2 / 3', borderRadius: 8, overflow: 'hidden', flexShrink: 0,
              boxShadow: '0 10px 32px rgba(0,0,0,0.65), 0 0 22px rgba(200,164,110,0.08)',
            }}>
              <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ maxWidth: 560, paddingTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'rgba(200,164,110,0.7)', fontFamily: FONT.cinzel, letterSpacing: 2 }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 34, fontWeight: 700, color: '#e8e0d0', fontFamily: FONT.serif, lineHeight: 1.2, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                  {book.title}
                </span>
              </div>
              <div style={{ fontSize: 22, color: '#c0b29a', fontFamily: FONT.sans, marginTop: 8, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                {book.creator}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 본론: 세로(portrait) — 배경 이미지 + 인용구 오버레이 ===== */}
      {bodyOp > 0 && portrait && (
        <div style={{ position: 'absolute', inset: 0, opacity: bodyOp, zIndex: 10 }}>
          {/* CinematicPanel 배경 — 인용구 구간만 어둡게, 기본은 원본 */}
          {(() => {
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

          {/* 인용구 전용 표시 — 인용구 읽는 구간에만 */}
          {quotePairTimings.map((pt, pi) => {
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
        </div>
      )}

    </div>
  )
}
