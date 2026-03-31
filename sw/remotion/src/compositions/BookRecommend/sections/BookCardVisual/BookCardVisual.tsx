/**
 * BookCardVisual — 도서 소개 비주얼
 *
 * 1열 하단 텍스트: overflow:hidden 박스 + translateY 스크롤.
 * 오디오 진행률에 따라 콘텐츠가 위로 밀려올라가며,
 * 섹션 라벨(핵심요약/감상경위)은 상단 고정.
 */
import React, { useRef } from 'react'
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
import { safeImg, CELEB_VOICE_COLOR, CELEB_VOICE_HIGHLIGHT, CELEB_VOICE_BORDER, CELEB_VOICE_PADDING_LEFT } from '../../utils'
import { vnBookSummary, vnBookContext, vnBookQuote, vnBookContextAfter, vnTimingKey } from '../../voice-names'
import type { BookRecommendScript } from '../../types'
import { t } from '../../i18n'

const CLAMP = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

// ── 텍스트 앵커 → 프레임 해석 ──

/** voiceTimings에서 텍스트 앵커가 포함된 세그먼트를 찾아 절대 프레임 반환 */
function findTextFrame(
  anchor: string,
  timings: Record<string, VoiceTimingSegment[]> | undefined,
  sections: { key: string; baseFrame: number }[],
): number {
  if (!timings) return 0
  for (const { key, baseFrame } of sections) {
    const segs = timings[key]
    if (!segs) continue
    // 세그먼트를 이어붙인 전체 텍스트에서 앵커를 찾고, 해당 위치의 세그먼트 시작 시간을 반환
    // → WhisperX 세그먼트 경계와 무관하게 작동
    let offset = 0
    const positions: { offset: number; seg: VoiceTimingSegment }[] = []
    for (const seg of segs) {
      if (!seg.text) continue
      positions.push({ offset, seg })
      offset += seg.text.length + 1 // +1 for space
    }
    const fullText = segs.filter(s => s.text).map(s => s.text).join(' ')
    const pos = fullText.indexOf(anchor)
    if (pos === -1) continue
    for (let i = positions.length - 1; i >= 0; i--) {
      if (pos >= positions[i].offset) return baseFrame + f(positions[i].seg.start)
    }
  }
  return 0
}

/** book.images 텍스트 앵커를 프레임으로 해석 */
function resolveImageTransitions(
  book: BookEntry,
  bookIndex: number,
  timings: Record<string, VoiceTimingSegment[]> | undefined,
  sSummary: number,
  sContext: number,
  sContextAfter: number,
): ImageTransition[] | undefined {
  if (!book.images?.length) return undefined
  const sections = [
    { key: vnTimingKey(vnBookSummary(bookIndex)), baseFrame: sSummary },
    { key: vnTimingKey(vnBookContext(bookIndex)), baseFrame: sContext },
    { key: vnTimingKey(vnBookContextAfter(bookIndex)), baseFrame: sContextAfter },
  ]
  return book.images.map((img, i) => ({
    frame: (i === 0 || !img.text) ? 0 : findTextFrame(img.text, timings, sections),
    file: img.file,
    keyword: img.keyword,
  }))
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

  // --- 레이아웃 상수 ---
  const BODY_LH = 1.5
  const SQ_POSTER_H = 260
  const VISIBLE_H = 1080 - 80 - 72 - SQ_POSTER_H - 32 * 2 - 1 - SECTION_LABEL_H

  // --- 타이밍 ---
  const summaryAllTimings = timings?.[vnTimingKey(vnBookSummary(index))]
  const contextAllTimings = timings?.[vnTimingKey(vnBookContext(index))]

  // --- 스크롤: 매 프레임 ref에서 scrollHeight 직접 읽기 ---
  const summaryContentRef = useRef<HTMLDivElement>(null)
  const contextContentRef = useRef<HTMLDivElement>(null)

  const isSquare = true

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
  const contextTotalEnd = hasContextAfter
    ? sContextAfter + contextAfterFrames
    : hasQuote ? sQuote + quoteFrames : sContextEnd

  // --- 이미지 전환 (텍스트 앵커 해석) ---
  const imageTransitions = resolveImageTransitions(book, index, timings, sSummary, sContext, sContextAfter)

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
    : 1
  const contextAfterOp = hasContextAfter
    ? interpolate(frame, [sContextAfter, sContextAfter + f(0.5)], [0, 1], CLAMP)
    : 1

  // --- 스크롤 계산 (줄 정렬 페이지 점프 + 1줄 오버랩) ---
  const LINE_H = 38 * BODY_LH // 57
  const PAGE_LINES = Math.floor(VISIBLE_H / LINE_H) // 9줄
  const STEP = (PAGE_LINES - 1) * LINE_H // 456 — 8줄 진행, 마지막 1줄은 다음 페이지 맨 위에 겹침
  const FLIP = f(0.4)

  const pageSnap = (totalH: number, sStart: number, sEnd: number) => {
    if (totalH <= VISIBLE_H) return 0
    const maxScroll = totalH - VISIBLE_H
    const progress = interpolate(frame, [sStart, sEnd], [0, 1], CLAMP)
    const rawY = progress * totalH
    const pageIdx = Math.floor(rawY / STEP)
    const target = Math.min(pageIdx * STEP, maxScroll)
    const jumpProgress = pageIdx * STEP / totalH
    const jumpFrame = sStart + jumpProgress * (sEnd - sStart)
    const prev = Math.min(Math.max(0, (pageIdx - 1) * STEP), maxScroll)
    return interpolate(frame, [jumpFrame, jumpFrame + FLIP], [prev, target], CLAMP)
  }

  const summaryScrollY = pageSnap(summaryContentRef.current?.scrollHeight ?? 0, sSummary, sSummaryEnd)
  const contextScrollY = pageSnap(contextContentRef.current?.scrollHeight ?? 0, sContext, contextTotalEnd)

  const sqTextH = VISIBLE_H + SECTION_LABEL_H

  // ==================== 텍스트 블록 ====================
  const summaryBlock = (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <SectionLabel label={i18n.labelSummary} opacity={summaryLabelOp} />
      <div style={{ height: VISIBLE_H, overflow: 'hidden' }}>
        <div ref={summaryContentRef} style={{
          opacity: summaryBodyOp,
          transform: `translateY(-${summaryScrollY}px)`,
          fontFamily: FONT.sans,
        }}>
          <Typewriter text={book.summary} startFrame={sSummary} spreadFrames={summaryFrames - f(0.5)}
            color="#d0d0d0" fontSize={38} style={{ lineHeight: BODY_LH }}
            timings={summaryAllTimings} />
        </div>
      </div>
    </div>
  )

  const contextBlock = (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <SectionLabel label={i18n.labelContext} opacity={contextLabelOp} />
      <div style={{ height: VISIBLE_H, overflow: 'hidden' }}>
        <div ref={contextContentRef} style={{
          opacity: contextBodyOp,
          transform: `translateY(-${contextScrollY}px)`,
          fontFamily: FONT.sans,
        }}>
          {/* 감상경위 본문 */}
          <Typewriter text={book.context} startFrame={sContext} spreadFrames={contextFrames - f(0.5)}
            color="#bbb" fontSize={38} style={{ lineHeight: BODY_LH }}
            timings={contextAllTimings} />

          {/* 인용문 */}
          {hasQuote && book.directQuote && (
            <div style={{
              opacity: quoteOp, marginTop: 8,
              borderLeft: CELEB_VOICE_BORDER, paddingLeft: CELEB_VOICE_PADDING_LEFT,
            }}>
              <Typewriter text={book.directQuote} startFrame={sQuote} spreadFrames={quoteFrames - f(0.5)}
                color={CELEB_VOICE_COLOR} highlightColor={CELEB_VOICE_HIGHLIGHT}
                fontSize={38} style={{ fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.5 }}
                timings={timings?.[vnTimingKey(vnBookQuote(index))]} />
              <div style={{ color: '#888', fontSize: 22, fontFamily: FONT.sans, marginTop: 4 }}>
                — {host.nickname}{book.directQuoteSource ? `, ${book.directQuoteSource}` : ''}
              </div>
            </div>
          )}

          {/* 후속 맥락 */}
          {hasContextAfter && contextAfterText && (
            <div style={{ opacity: contextAfterOp, marginTop: 12, fontFamily: FONT.sans }}>
              <Typewriter text={contextAfterText} startFrame={sContextAfter} spreadFrames={contextAfterFrames - f(0.5)}
                color="#bbb" fontSize={38} style={{ lineHeight: BODY_LH }}
                timings={timings?.[vnTimingKey(vnBookContextAfter(index))]} />
            </div>
          )}
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
          display: 'flex', padding: `80px ${CINEM_PAD}px 72px`, gap: 24,
        }}>
          {/* 1열: 1행 책정보 + 2행 본문 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 32 }}>
            {/* 1행: 포스터 + 책 메타 */}
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
                {/* 책 번호 워터마크 */}
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
                {(book.stats.publishYear || book.stats.publisher) && (
                  <div style={{ fontSize: 18, color: '#5a5248', fontFamily: FONT.sans, marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {book.stats.publishYear && <span style={{ letterSpacing: 1 }}>{book.stats.publishYear}</span>}
                    {book.stats.publishYear && book.stats.publisher && <span style={{ color: 'rgba(200,164,110,0.3)' }}>|</span>}
                    {book.stats.publisher && <span>{book.stats.publisher}</span>}
                  </div>
                )}
              </div>
            </div>
            {/* 구분선 */}
            <div style={{
              flexShrink: 0, height: 1, opacity: posterOp,
              background: 'linear-gradient(90deg, transparent, rgba(200,164,110,0.3) 20%, rgba(200,164,110,0.3) 80%, transparent)',
            }} />
            {/* 2행: 본문 */}
            <div style={{ height: sqTextH, position: 'relative', flexShrink: 0 }}>
              {textContent}
            </div>
          </div>
          {/* 2열: 배경연출 (1:1, 세로 꽉참) */}
          <div style={{ flexShrink: 0, height: '100%', aspectRatio: '1 / 1', opacity: posterOp, position: 'relative' }}>
            <CinematicPanel episodeName={episodeName} book={book} sLabelContext={sLabelContext} imageTransitions={imageTransitions} />
          </div>
        </div>
      )}

    </div>
  )
}
