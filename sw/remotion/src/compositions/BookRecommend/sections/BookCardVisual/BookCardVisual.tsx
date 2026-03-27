/**
 * BookCardVisual — 도서 소개 비주얼
 *
 * 기본 레이아웃 (이미지 없음):
 *   좌 40%: 포스터 | 우 60%: 텍스트
 *
 * 시네마틱 레이아웃 (에피소드 이미지 있음):
 *   상단 45%: 좌 포스터 + 우 시네마틱 이미지(16:9)
 *   하단 55%: 전폭 텍스트
 */
import React from 'react'
import { Img, interpolate, useCurrentFrame } from 'remotion'
import type { BookEntry, CelebHost, VoiceTimingSegment } from '../../types'
import { DARK_BG } from '../../../theme'
import { Typewriter } from '../Typewriter'
import { PaginatedSection } from './PaginatedSection'
import { BookCardHero } from './BookCardHero'
import { CinematicPanel } from './CinematicPanel'
import { FONT } from '../../fonts'
import {
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP, f,
} from '../../timing'
import { safeImg, paginateSentences, slicePageTimings, CELEB_VOICE_COLOR, CELEB_VOICE_HIGHLIGHT, CELEB_VOICE_BORDER, CELEB_VOICE_PADDING_LEFT } from '../../utils'
import { vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter, vnTimingKey } from '../../voice-names'
import type { BookRecommendScript } from '../../types'
import { t } from '../../i18n'

const CLAMP = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

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
  hasQuote: boolean
  quoteFrames: number
  hasContextAfter: boolean
  contextAfterFrames: number
  contextAfterText?: string
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
  contextFrames, contextEnd, hasQuote, quoteFrames, hasContextAfter, contextAfterFrames, contextAfterText,
  labelSummaryF, labelContextF, titleSummaryGapF, summaryContextGapF, episodeName, timings, script,
}) => {
  const i18n = t(script)
  const frame = useCurrentFrame()

  if (frame < 0 || frame > totalFrames) return null

  // --- 페이즈 경계 (Series 오디오 배치와 완전 일치) ---
  const sLabelSummary = titleFrames + titleSummaryGapF
  const sSummary = sLabelSummary + labelSummaryF
  const sSummaryEnd = sSummary + summaryFrames
  const sLabelContext = sSummaryEnd + summaryContextGapF
  const sContext = sLabelContext + labelContextF
  const sContextEnd = sContext + contextFrames
  const sQuote = hasQuote ? sContextEnd + CONTEXT_QUOTE_GAP : totalFrames
  const sContextAfter = hasContextAfter ? sQuote + quoteFrames + QUOTE_CONTEXTAFTER_GAP : totalFrames

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
  const quoteOp = hasQuote
    ? interpolate(frame, [sQuote, sQuote + f(0.5)], [0, 1], CLAMP)
    : 0
  const contextAfterOp = hasContextAfter
    ? interpolate(frame, [sContextAfter, sContextAfter + f(0.5)], [0, 1], CLAMP)
    : 0

  // --- 텍스트 페이징 ---
  // 2행: 콘텐츠 영역(돌판 5% 제외) × 25% − padding 12px
  const VISIBLE_H = 1080 * 0.95 * 0.25 - 12
  const BODY_LH = 1.5
  const LINE_H = 38 * BODY_LH
  const LABEL_H = 0
  const CPL = script.locale === 'en' ? 55 : 40
  const LINES_PER_PAGE = Math.floor((VISIBLE_H - LABEL_H) / LINE_H)
  const CHARS_PER_PAGE = LINES_PER_PAGE * CPL
  const FLIP_F = f(0.4)

  const estH = (len: number) => Math.ceil(len / CPL) * LINE_H + LABEL_H
  const centerY = (h: number) => h < VISIBLE_H ? (VISIBLE_H - h) / 2 : 16

  const summaryAllTimings = timings?.[vnTimingKey(vnBookSummary(index))]
  const { pages: summaryPages, ranges: summaryRanges } = paginateSentences(book.summary, CHARS_PER_PAGE, summaryAllTimings)
  const summaryBaseY = centerY(estH(summaryPages.length > 1 ? summaryPages[0].length : book.summary.length))
  const summaryPT = slicePageTimings(summaryRanges, summaryAllTimings)

  const contextAllTimings = timings?.[vnTimingKey(vnBookContext(index))]
  const { pages: contextPages, ranges: contextRanges } = paginateSentences(book.context, CHARS_PER_PAGE, contextAllTimings)
  const contextPT = slicePageTimings(contextRanges, contextAllTimings)
  const QUOTE_CPL = script.locale === 'en' ? 32 : 18
  const quoteEstH = hasQuote && book.directQuote ? Math.ceil(book.directQuote.length / QUOTE_CPL) * 67 + 42 : 0
  const ctxAfterEstH = hasContextAfter && contextAfterText ? Math.ceil(contextAfterText.length / CPL) * LINE_H + 24 : 0
  const ctxExtraH = quoteEstH + ctxAfterEstH
  const contextBaseY = contextPages.length > 1 ? 16
    : centerY(estH(book.context.length) + ctxExtraH - LABEL_H)

  const needsCtxPageBreak = hasQuote && (estH(book.context.length) + ctxExtraH - LABEL_H > VISIBLE_H)
  const ctxBodyFadeOut = needsCtxPageBreak
    ? interpolate(frame, [sQuote - FLIP_F, sQuote + f(0.1)], [1, 0], CLAMP) : 1
  const ctxBodySlideX = needsCtxPageBreak
    ? interpolate(frame, [sQuote - FLIP_F, sQuote + f(0.1)], [0, -80], CLAMP) : 0
  const quoteSlideX = needsCtxPageBreak
    ? interpolate(frame, [sQuote - FLIP_F, sQuote + f(0.1)], [80, 0], CLAMP) : 0

  const needsQuoteCtxAfterBreak = needsCtxPageBreak && hasQuote && hasContextAfter
    && (quoteEstH + ctxAfterEstH > VISIBLE_H)
  const quoteFadeOut = needsQuoteCtxAfterBreak
    ? interpolate(frame, [sContextAfter - FLIP_F, sContextAfter + f(0.1)], [1, 0], CLAMP) : 1
  const quoteBodySlideX = needsQuoteCtxAfterBreak
    ? interpolate(frame, [sContextAfter - FLIP_F, sContextAfter + f(0.1)], [0, -80], CLAMP) : 0
  const ctxAfterSlideX = needsQuoteCtxAfterBreak
    ? interpolate(frame, [sContextAfter - FLIP_F, sContextAfter + f(0.1)], [80, 0], CLAMP) : 0

  // ==================== 텍스트 콘텐츠 (양쪽 레이아웃 공유) ====================
  const textContent = (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* 요약 블록 */}
      {(summaryLabelOp + summaryBodyOp > 0) && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${summaryBaseY}px)` }}>
          <PaginatedSection
            text={book.summary} pages={summaryPages} pageTimings={summaryPT}
            startFrame={sSummary} spreadFrames={summaryFrames - f(0.5)}
            bodyOp={summaryBodyOp} labelOp={summaryLabelOp}
            markerLabel={i18n.labelSummary}
            textColor="#d0d0d0" timings={timings?.[vnTimingKey(vnBookSummary(index))]}
          />
        </div>
      )}

      {/* 경위 블록 */}
      {(contextLabelOp + contextBodyOp + quoteOp + contextAfterOp > 0) && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${contextBaseY}px)` }}>
          <div style={{ position: 'relative' }}>
            <div style={{ opacity: ctxBodyFadeOut, transform: `translateX(${ctxBodySlideX}px)` }}>
              <PaginatedSection
                text={book.context} pages={contextPages} pageTimings={contextPT}
                startFrame={sContext} spreadFrames={contextFrames - f(0.5)}
                bodyOp={contextBodyOp} labelOp={contextLabelOp}
                markerLabel={i18n.labelContext}
                textColor="#bbb" timings={timings?.[vnTimingKey(vnBookContext(index))]}
              />
            </div>

            {/* 인용문 + 후속맥락 */}
            <div style={needsCtxPageBreak ? { position: 'absolute' as const, top: 0, left: 0, right: 0, transform: `translateX(${quoteSlideX}px)` } : {}}>
              {hasQuote && book.directQuote && (
                <div style={{ opacity: quoteOp * quoteFadeOut, transform: `translateX(${quoteBodySlideX}px)`, borderLeft: CELEB_VOICE_BORDER, paddingLeft: CELEB_VOICE_PADDING_LEFT, marginTop: needsCtxPageBreak ? 0 : 4, marginBottom: hasContextAfter && !needsQuoteCtxAfterBreak ? 12 : 0 }}>
                  <Typewriter
                    text={book.directQuote}
                    startFrame={sQuote}
                    spreadFrames={quoteFrames - f(0.5)}
                    color={CELEB_VOICE_COLOR}
                    highlightColor={CELEB_VOICE_HIGHLIGHT}
                    fontSize={38}
                    style={{ fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.5 }}
                    timings={timings?.[vnTimingKey(vnBookQuote(index))]}
                  />
                  <div style={{ color: '#888', fontSize: 22, fontFamily: FONT.sans, marginTop: 4 }}>
                    — {host.nickname}{book.directQuoteSource ? `, ${book.directQuoteSource}` : ''}
                  </div>
                </div>
              )}

              {hasContextAfter && contextAfterText && (
                <div style={{ ...(needsQuoteCtxAfterBreak ? { position: 'absolute' as const, top: 0, left: 0, right: 0, transform: `translateX(${ctxAfterSlideX}px)` } : {}), opacity: contextAfterOp, borderLeft: '5px solid rgba(153,153,153,0.3)', paddingLeft: 28, fontFamily: FONT.sans }}>
                  <Typewriter text={contextAfterText} startFrame={sContextAfter} spreadFrames={contextAfterFrames - f(0.5)} color="#bbb" fontSize={38} style={{ lineHeight: BODY_LH }} timings={timings?.[vnTimingKey(vnBookContextAfter(index))]} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>

      {/* 배경 */}
      <div style={{ position: 'absolute', inset: 0, background: DARK_BG.radial }} />

      <BookCardHero book={book} locale={script.locale} publishYearLabel={i18n.publishYear} sLabelSummary={sLabelSummary} />

      {/* ===== 본문: 시네마틱 레이아웃 (1행 비주얼 / 2행 텍스트) ===== */}
      {bodyOp > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: bodyOp, zIndex: 10, display: 'flex', flexDirection: 'column' }}>

          {/* 1행 (75%): 포스터 + 시네마틱 이미지 */}
          <div style={{ height: '75%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: `80px ${CINEM_PAD}px 12px`, gap: 20 }}>
            <div style={{ flexShrink: 0, height: '100%', opacity: posterOp, transform: `translateY(${posterY}px)` }}>
              <div style={{
                height: '100%', aspectRatio: '2 / 3', borderRadius: 10, overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(200,164,110,0.08)',
              }}>
                <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
            <div style={{ height: '100%', opacity: posterOp }}>
              <CinematicPanel episodeName={episodeName} bookIndex={index} book={book} sLabelContext={sLabelContext} />
            </div>
          </div>

          {/* 2행: 전폭 텍스트 — 나머지 공간 채움 */}
          <div style={{ flex: 1, position: 'relative', padding: `12px ${CINEM_PAD}px 0` }}>
            <div style={{ width: '100%', height: '100%' }}>
              {textContent}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
