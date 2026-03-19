/**
 * BookCardVisual — 3분할 레이아웃
 *
 * 화면을 가로 3등분:
 *   1열: 책 표지 포스터 (고정)
 *   2~3열: 생성 이미지 배경 + 텍스트 패널 오버레이
 *
 * 제목 페이즈: 표지 히어로 (1열 중앙, 기존 유지)
 * 요약 페이즈: 좌 표지 | 우 summary 이미지 배경 + 요약 텍스트
 * 경위 페이즈: 좌 표지 | 우 context 이미지 배경 + 경위 텍스트
 */
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookEntry, CelebHost, VoiceTimingSegment } from '../types'
import { KoreanTypewriter } from './KoreanTypewriter'
import { FONT } from '../fonts'
import {
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP, f,
} from '../timing'
import { safeImg, sf, imageBase } from '../utils'
import { vnBookSummary, vnBookContext, vnBookContextAfter, vnTimingKey } from '../voice-names'
import type { BookRecommendScript } from '../types'
import { t } from '../i18n'

const CLAMP = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

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
  totalBooks: number
  /** 동적 라벨 프레임 (JSON duration 기반) */
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
  contextFrames, contextEnd, hasQuote, quoteFrames, hasContextAfter, contextAfterFrames, contextAfterText, totalBooks,
  labelSummaryF, labelContextF, titleSummaryGapF, summaryContextGapF, episodeName, timings, script,
}) => {
  const i18n = t(script)
  const imf = (file: string) => sf(`images/${imageBase(episodeName)}/${file}`)
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  if (frame < 0 || frame > totalFrames) return null

  // --- 페이즈 경계 (Series 오디오 배치와 완전 일치) ---
  // Series visual 레이아웃:
  //   title(titleFrames) → offset TSG → labelSummary(LSF) → offset 0 → summary(summaryFrames)
  //   → offset SCG → labelContext(LCF) → offset 0 → context(contextFrames)
  //   → offset CQG → quote(quoteFrames) → offset QCAG → contextAfter(caFrames)
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

  // --- 제목 페이즈 ---
  const titlePhaseOp = interpolate(frame,
    [0, f(0.33), sLabelSummary - f(0.67), sLabelSummary],
    [0, 1, 1, 0], CLAMP)

  // --- 2열 레이아웃 등장 ---
  const twoColOp = interpolate(frame,
    [sLabelSummary - f(0.67), sLabelSummary],
    [0, 1], CLAMP)

  // 표지 등장 spring (제목 페이즈)
  const coverScale = spring({ frame: Math.max(0, frame - f(0.17)), fps, config: { damping: 14, stiffness: 140 } })
  const coverY = interpolate(frame, [0, f(0.67)], [40, 0], CLAMP)

  // 좌측 포스터 등장 (2열 페이즈)
  const posterOp = interpolate(frame, [sLabelSummary - f(0.33), sLabelSummary + f(0.5)], [0, 1], CLAMP)
  const posterY = interpolate(frame, [sLabelSummary - f(0.33), sLabelSummary + f(0.5)], [20, 0], CLAMP)

  // 메타 정보
  const infoOp = interpolate(frame, [sLabelSummary, sLabelSummary + f(0.67)], [0, 1], CLAMP)

  // 레이블·본문 opacity — Series 기준 위치로 직접 계산
  const summaryLabelOp = interpolate(frame,
    [sLabelSummary, sLabelSummary + f(0.5), sLabelContext, sLabelContext + f(0.5)],
    [0, 1, 1, 0], CLAMP)
  const summaryBodyOp = interpolate(frame,
    [sSummary, sSummary + f(0.67), sLabelContext, sLabelContext + f(0.5)],
    [0, 1, 1, 0], CLAMP)

  const contextLabelOp = interpolate(frame, [sLabelContext, sLabelContext + f(0.5)], [0, 1], CLAMP)
  const contextBodyOp = interpolate(frame, [sContext, sContext + f(0.67)], [0, 1], CLAMP)

  const quoteOp = hasQuote
    ? interpolate(frame, [sQuote, sQuote + f(0.5)], [0, 1], CLAMP)
    : 0
  const contextAfterOp = hasContextAfter
    ? interpolate(frame, [sContextAfter, sContextAfter + f(0.5)], [0, 1], CLAMP)
    : 0

  // 생성 이미지
  const summaryImageUrl = imf(`book-${index}-summary.png`)
  const contextImageUrl = imf(`book-${index}-context.png`)

  // 배경 이미지 전환: 요약 이미지 → 경위 이미지
  const summaryBgOp = interpolate(frame,
    [sLabelSummary, sLabelSummary + f(0.67), sLabelContext, sLabelContext + f(0.67)],
    [0, 1, 1, 0], CLAMP)
  const contextBgOp = interpolate(frame,
    [sLabelContext - f(0.67), sLabelContext],
    [0, 1], CLAMP)

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>

      {/* 배경 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #1a1510 0%, #0a0a0a 70%)' }} />

      {/* 상단 번호 바 — 카운트업 애니메이션 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '36px 80px 0', zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, overflow: 'hidden', height: 24 }}>
          <div style={{ position: 'relative', width: 50, height: 24 }}>
            {index > 0 && (
              <div style={{
                position: 'absolute', width: '100%',
                color: '#c8a46e', fontSize: 15, fontFamily: FONT.cinzel, letterSpacing: 3, fontWeight: 600,
                transform: `translateY(${interpolate(frame, [0, f(0.6)], [0, -24], CLAMP)}px)`,
                opacity: interpolate(frame, [0, f(0.4)], [0.6, 0], CLAMP),
              }}>
                {index}/{totalBooks}
              </div>
            )}
            <div style={{
              position: 'absolute', width: '100%',
              color: '#c8a46e', fontSize: 15, fontFamily: FONT.cinzel, letterSpacing: 3, fontWeight: 600,
              transform: `translateY(${interpolate(frame, [0, f(0.6)], [index > 0 ? 24 : 8, 0], CLAMP)}px)`,
              opacity: interpolate(frame, [f(0.1), f(0.67)], [0, 1], CLAMP),
            }}>
              {index + 1}/{totalBooks}
            </div>
          </div>
          <div style={{ width: 1, height: 16, backgroundColor: '#c8a46e', opacity: interpolate(frame, [f(0.33), f(0.73)], [0, 0.3], CLAMP) }} />
          <div style={{
            color: '#e8e0d0', fontSize: 16, fontFamily: FONT.serif, fontWeight: 600,
            opacity: interpolate(frame, [f(0.33), f(0.83)], [0, 0.7], CLAMP),
          }}>
            {book.title}
          </div>
        </div>
      </div>

      {/* ===== 제목 페이즈: 표지 히어로 (중앙) ===== */}
      {titlePhaseOp > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: titlePhaseOp, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ transform: `translateY(${coverY}px) scale(${coverScale})`, marginBottom: 40 }}>
            <div style={{
              width: 416, height: 624, borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 36px 90px rgba(0,0,0,0.7), 0 0 70px rgba(200,164,110,0.1)',
            }}>
              <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <div style={{
            opacity: interpolate(frame, [f(0.5), f(1.17)], [0, 1], CLAMP),
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ color: '#e8e0d0', fontSize: 47, fontWeight: 700, fontFamily: FONT.serif, textAlign: 'center' }}>
              {script.locale === 'en' ? `"${book.title}"` : `「${book.title}」`}
            </div>
            <div style={{ color: '#c8a46e', fontSize: 26, fontFamily: FONT.sans }}>{book.creator}</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 6 }}>
              {book.source && <div style={{ color: '#666', fontSize: 18, fontFamily: FONT.sans }}>{book.source}</div>}
              {book.stats.publisher && (
                <><div style={{ color: '#444', fontSize: 18 }}>·</div><div style={{ color: '#666', fontSize: 18, fontFamily: FONT.sans }}>{book.stats.publisher}</div></>
              )}
              {book.stats.publishYear && (
                <><div style={{ color: '#444', fontSize: 18 }}>·</div><div style={{ color: '#666', fontSize: 18, fontFamily: FONT.sans }}>{i18n.publishYear(book.stats.publishYear!)}</div></>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 3분할 레이아웃: 1열 포스터 | 2~3열 이미지배경+텍스트 ===== */}
      {twoColOp > 0 && (
        <div style={{
          position: 'absolute', inset: 0, opacity: twoColOp, zIndex: 10,
          display: 'flex',
        }}>
          {/* 1열: 책 표지 포스터 + 메타 정보 */}
          <div style={{
            width: '40%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
            paddingRight: 40,
          }}>
            <div style={{ opacity: posterOp, transform: `translateY(${posterY}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 320, height: 480, borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(200,164,110,0.08)',
                marginBottom: 24,
              }}>
                <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ opacity: infoOp, textAlign: 'center', maxWidth: 340 }}>
                <div style={{ color: '#e8e0d0', fontSize: 28, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.3, marginBottom: 6 }}>
                  {script.locale === 'en' ? `"${book.title}"` : `「${book.title}」`}
                </div>
                <div style={{ color: '#c8a46e', fontSize: 19, fontFamily: FONT.sans, marginBottom: 6 }}>{book.creator}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                  {book.source && <div style={{ color: '#666', fontSize: 15, fontFamily: FONT.sans }}>{book.source}</div>}
                  {book.stats.publisher && (
                    <><div style={{ color: '#444', fontSize: 15 }}>·</div><div style={{ color: '#666', fontSize: 15, fontFamily: FONT.sans }}>{book.stats.publisher}</div></>
                  )}
                  {book.stats.publishYear && (
                    <><div style={{ color: '#444', fontSize: 15 }}>·</div><div style={{ color: '#666', fontSize: 15, fontFamily: FONT.sans }}>{i18n.publishYear(book.stats.publishYear!)}</div></>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2열: 이미지 배경 + 텍스트 (3/5) */}
          <div style={{
            width: '60%', position: 'relative', overflow: 'hidden',
          }}>
            {/* 배경 이미지 레이어 — 요약 이미지 */}
            {summaryBgOp > 0 && (
              <div style={{ position: 'absolute', inset: 0, opacity: summaryBgOp }}>
                <Img src={summaryImageUrl} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'brightness(0.4) saturate(0.7)',
                }} />
              </div>
            )}
            {/* 배경 이미지 레이어 — 경위 이미지 */}
            {contextBgOp > 0 && (
              <div style={{ position: 'absolute', inset: 0, opacity: contextBgOp }}>
                <Img src={contextImageUrl} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'brightness(0.4) saturate(0.7)',
                }} />
              </div>
            )}
            {/* 비네팅 */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(10,10,10,0.7) 100%)' }} />
            {/* 좌측 경계 그라디언트 — 표지 영역과 자연스럽게 연결 */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 80, background: 'linear-gradient(to right, #0a0a0a, transparent)' }} />

            {/* 텍스트 배경 — 반투명 어둡게 */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 4, background: 'rgba(10,10,10,0.4)' }} />

            {/* 텍스트 패널 — [헤더+본문] 묶어서 세로 중앙 배치 */}
            <div style={{
              position: 'relative', zIndex: 5,
              display: 'flex', alignItems: 'center',
              height: '100%', padding: '0 60px 0 40px',
            }}>
              <div style={{ width: '100%', height: '100%' }}>
              {/* 본문 영역 — 요약/경위 absolute 크로스페이드 (레이아웃 시프트 방지) */}
              <div style={{ maxWidth: 700, position: 'relative', height: '100%' }}>
                {/* 요약 블록 */}
                {(summaryLabelOp + summaryBodyOp > 0) && (
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)' }}>
                  <div style={{ opacity: summaryLabelOp, color: '#8bb8a8', fontSize: 26, fontWeight: 700, fontFamily: FONT.sans, letterSpacing: 3, marginBottom: 20, textAlign: 'center' }}>
                    {i18n.labelSummary}
                  </div>
                  <div style={{
                    opacity: summaryLabelOp,
                    width: interpolate(frame, [sLabelSummary, sLabelSummary + f(0.83)], [0, 400], CLAMP),
                    height: 1, backgroundColor: '#8bb8a8', opacity: 0.3, marginBottom: 24, marginLeft: 'auto', marginRight: 'auto',
                  }} />
                  <div style={{ opacity: summaryBodyOp, borderLeft: '4px solid rgba(139,184,168,0.4)', paddingLeft: 24, fontFamily: FONT.sans }}>
                    <KoreanTypewriter text={book.summary} startFrame={sSummary} spreadFrames={summaryFrames - f(0.5)} color="#d0d0d0" fontSize={27} style={{ lineHeight: 1.8 }} timings={timings?.[vnTimingKey(vnBookSummary(index))]} />
                  </div>
                </div>
                )}

                {/* 경위 블록 */}
                {(contextLabelOp + contextBodyOp + quoteOp + contextAfterOp > 0) && (
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)' }}>
                    <div style={{ opacity: contextLabelOp, color: '#999', fontSize: 26, fontWeight: 700, fontFamily: FONT.sans, letterSpacing: 3, marginBottom: 20, textAlign: 'center' }}>
                      {i18n.labelContext}
                    </div>
                    <div style={{
                      opacity: contextLabelOp,
                      width: interpolate(frame, [sLabelContext, sLabelContext + f(0.83)], [0, 400], CLAMP),
                      height: 1, backgroundColor: '#999', opacity: 0.3, marginBottom: 24, marginLeft: 'auto', marginRight: 'auto',
                    }} />
                    <div style={{ opacity: contextBodyOp, borderLeft: '4px solid rgba(153,153,153,0.3)', paddingLeft: 24, fontFamily: FONT.sans, marginBottom: hasQuote ? 24 : 0 }}>
                      <KoreanTypewriter text={book.context} startFrame={sContext} spreadFrames={contextFrames - f(0.5)} color="#bbb" fontSize={27} style={{ lineHeight: 1.8 }} timings={timings?.[vnTimingKey(vnBookContext(index))]} />
                    </div>

                    {/* 인용문 */}
                    {hasQuote && book.directQuote && (
                      <div style={{ opacity: quoteOp, borderLeft: '4px solid rgba(200,164,110,0.5)', paddingLeft: 24, marginTop: 10, marginBottom: hasContextAfter ? 24 : 0 }}>
                        <div style={{ color: '#c8a46e', fontSize: 29, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.6 }}>
                          "{book.directQuote}"
                        </div>
                        <div style={{ color: '#888', fontSize: 17, fontFamily: FONT.sans, marginTop: 8 }}>
                          — {host.nickname}{book.directQuoteSource ? `, ${book.directQuoteSource}` : ''}
                        </div>
                      </div>
                    )}

                    {/* 후속 맥락 */}
                    {hasContextAfter && contextAfterText && (
                      <div style={{ opacity: contextAfterOp, borderLeft: '4px solid rgba(153,153,153,0.3)', paddingLeft: 24, fontFamily: FONT.sans }}>
                        <KoreanTypewriter text={contextAfterText} startFrame={sContextAfter} spreadFrames={contextAfterFrames - f(0.5)} color="#bbb" fontSize={27} style={{ lineHeight: 1.8 }} timings={timings?.[vnTimingKey(vnBookContextAfter(index))]} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>{/* /wrapper */}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
