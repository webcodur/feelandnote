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
import type { BookEntry, CelebHost } from './types'
import { KoreanTypewriter } from './KoreanTypewriter'
import { FONT } from './fonts'
import {
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  PRE_LABEL_GAP,
} from './timing'
import { safeImg, sf } from './utils'

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
}

export const BookCardVisual: React.FC<Props> = ({
  book, host, index, totalFrames, titleFrames, summaryFrames, summaryEnd,
  contextFrames, contextEnd, hasQuote, quoteFrames, hasContextAfter, contextAfterFrames, contextAfterText, totalBooks,
  labelSummaryF, labelContextF, titleSummaryGapF, summaryContextGapF, episodeName,
}) => {
  const imf = (file: string) => sf(`images/${episodeName}/${file}`)
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  if (frame < 0 || frame > totalFrames) return null

  // --- 페이즈 경계 ---
  const summaryStart = titleFrames + titleSummaryGapF
  const contextStart = summaryEnd + summaryContextGapF
  const quoteStart = hasQuote ? contextEnd + CONTEXT_QUOTE_GAP : totalFrames
  const contextAfterStart = hasContextAfter ? quoteStart + quoteFrames + QUOTE_CONTEXTAFTER_GAP : totalFrames

  // --- 공통 ---
  const fadeOut = interpolate(frame, [totalFrames - 30, totalFrames], [1, 0], CLAMP)

  // --- 제목 페이즈 ---
  const titlePhaseOp = interpolate(frame,
    [0, 10, summaryStart - 20, summaryStart],
    [0, 1, 1, 0], CLAMP)

  // --- 2열 레이아웃 등장 ---
  const twoColOp = interpolate(frame,
    [summaryStart - 20, summaryStart],
    [0, 1], CLAMP)

  // 표지 등장 spring (제목 페이즈)
  const coverScale = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 140 } })
  const coverY = interpolate(frame, [0, 20], [40, 0], CLAMP)

  // 좌측 포스터 등장 (2열 페이즈)
  const posterOp = interpolate(frame, [summaryStart - 10, summaryStart + 15], [0, 1], CLAMP)
  const posterY = interpolate(frame, [summaryStart - 10, summaryStart + 15], [20, 0], CLAMP)

  // 메타 정보
  const infoOp = interpolate(frame, [summaryStart, summaryStart + 20], [0, 1], CLAMP)

  // 레이블·본문 opacity — 라벨은 2열 레이아웃 등장 후 표시
  // visual 모드: 라벨 지연(labelSummaryF)만큼 fadeOut도 밀어줌
  const summaryFadeOut = summaryEnd + labelSummaryF + PRE_LABEL_GAP
  const summaryLabelIn = summaryStart
  const summaryBodyIn = summaryStart + labelSummaryF
  const summaryLabelOp = interpolate(frame,
    [summaryLabelIn, summaryLabelIn + 15, summaryFadeOut, summaryFadeOut + 15],
    [0, 1, 1, 0], CLAMP)
  const summaryBodyOp = interpolate(frame,
    [summaryBodyIn, summaryBodyIn + 20, summaryFadeOut, summaryFadeOut + 15],
    [0, 1, 1, 0], CLAMP)

  const contextLabelIn = contextStart
  const contextBodyIn = contextStart + labelContextF
  const contextLabelOp = interpolate(frame, [contextLabelIn, contextLabelIn + 15], [0, 1], CLAMP)
  const contextBodyOp = interpolate(frame, [contextBodyIn, contextBodyIn + 20], [0, 1], CLAMP)

  const quoteOp = hasQuote
    ? interpolate(frame, [quoteStart + 5, quoteStart + 30], [0, 1], CLAMP)
    : 0
  const contextAfterOp = hasContextAfter
    ? interpolate(frame, [contextAfterStart + 5, contextAfterStart + 30], [0, 1], CLAMP)
    : 0

  // 생성 이미지
  const summaryImageUrl = imf(`book-${index}-summary.png`)
  const contextImageUrl = imf(`book-${index}-context.png`)

  // 배경 이미지 전환: 요약 이미지 → 경위 이미지
  const summaryBgOp = interpolate(frame,
    [summaryStart, summaryStart + 20, summaryFadeOut, summaryFadeOut + 20],
    [0, 1, 1, 0], CLAMP)
  const contextBgOp = interpolate(frame,
    [contextStart - 20, contextStart],
    [0, 1], CLAMP)

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>

      {/* 배경 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, #1a1510 0%, #0a0a0a 70%)' }} />

      {/* 상단 번호 바 */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '36px 80px 0', zIndex: 20,
        opacity: interpolate(frame, [5, 20], [0, 1], CLAMP),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ color: '#c8a46e', fontSize: 15, fontFamily: FONT.cinzel, letterSpacing: 3, fontWeight: 600 }}>
            {index + 1}/{totalBooks}
          </div>
          <div style={{ width: 1, height: 16, backgroundColor: '#c8a46e', opacity: 0.3 }} />
          <div style={{ color: '#e8e0d0', fontSize: 16, fontFamily: FONT.serif, fontWeight: 600, opacity: 0.7 }}>
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
            opacity: interpolate(frame, [15, 35], [0, 1], CLAMP),
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{ color: '#e8e0d0', fontSize: 47, fontWeight: 700, fontFamily: FONT.serif, textAlign: 'center' }}>
              「{book.title}」
            </div>
            <div style={{ color: '#c8a46e', fontSize: 26, fontFamily: FONT.sans }}>{book.creator}</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 6 }}>
              {book.source && <div style={{ color: '#666', fontSize: 18, fontFamily: FONT.sans }}>{book.source}</div>}
              {book.stats.publisher && (
                <><div style={{ color: '#444', fontSize: 18 }}>·</div><div style={{ color: '#666', fontSize: 18, fontFamily: FONT.sans }}>{book.stats.publisher}</div></>
              )}
              {book.stats.publishYear && (
                <><div style={{ color: '#444', fontSize: 18 }}>·</div><div style={{ color: '#666', fontSize: 18, fontFamily: FONT.sans }}>{book.stats.publishYear?.startsWith('기원전') ? book.stats.publishYear : `${book.stats.publishYear}년 집필`}</div></>
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
          {/* 1열: 책 표지 포스터 (2/5) */}
          <div style={{
            width: '40%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 40,
          }}>
            <div style={{ opacity: posterOp, transform: `translateY(${posterY}px)` }}>
              <div style={{
                width: 364, height: 546, borderRadius: 12, overflow: 'hidden',
                boxShadow: '0 24px 70px rgba(0,0,0,0.6), 0 0 50px rgba(200,164,110,0.08)',
              }}>
                <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  filter: 'brightness(0.2) saturate(0.7)',
                }} />
              </div>
            )}
            {/* 배경 이미지 레이어 — 경위 이미지 */}
            {contextBgOp > 0 && (
              <div style={{ position: 'absolute', inset: 0, opacity: contextBgOp }}>
                <Img src={contextImageUrl} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  filter: 'brightness(0.2) saturate(0.7)',
                }} />
              </div>
            )}
            {/* 비네팅 */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(10,10,10,0.7) 100%)' }} />
            {/* 좌측 경계 그라디언트 — 표지 영역과 자연스럽게 연결 */}
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 80, background: 'linear-gradient(to right, #0a0a0a, transparent)' }} />

            {/* 텍스트 배경 — 반투명 어둡게 */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 4, background: 'rgba(10,10,10,0.55)' }} />

            {/* 텍스트 패널 — [헤더+본문] 묶어서 세로 중앙 배치 */}
            <div style={{
              position: 'relative', zIndex: 5,
              display: 'flex', alignItems: 'center',
              height: '100%', padding: '0 60px 0 40px',
            }}>
              <div style={{ width: '100%' }}>
              {/* 책 메타 헤더 */}
              <div style={{ opacity: infoOp, marginBottom: 16, maxWidth: 700 }}>
                <div style={{ color: '#c8a46e', fontSize: 21, fontFamily: FONT.sans, marginBottom: 5 }}>{book.creator}</div>
                <div style={{ color: '#e8e0d0', fontSize: 42, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.3, marginBottom: 8 }}>
                  「{book.title}」
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  {book.source && <div style={{ color: '#666', fontSize: 17, fontFamily: FONT.sans }}>{book.source}</div>}
                  {book.stats.publisher && (
                    <><div style={{ color: '#444', fontSize: 17 }}>·</div><div style={{ color: '#666', fontSize: 17, fontFamily: FONT.sans }}>{book.stats.publisher}</div></>
                  )}
                  {book.stats.publishYear && (
                    <><div style={{ color: '#444', fontSize: 17 }}>·</div><div style={{ color: '#666', fontSize: 17, fontFamily: FONT.sans }}>{book.stats.publishYear?.startsWith('기원전') ? book.stats.publishYear : `${book.stats.publishYear}년 집필`}</div></>
                  )}
                </div>
                <div style={{
                  width: interpolate(frame, [summaryStart, summaryStart + 25], [0, 400], CLAMP),
                  height: 1, backgroundColor: '#c8a46e', opacity: 0.3,
                }} />
              </div>

              {/* 본문 영역 — 요약/경위 크로스페이드 (둘 다 absolute) */}
              <div style={{ position: 'relative', maxWidth: 700, minHeight: 580 }}>
                {/* 요약 블록 */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                  <div style={{ opacity: summaryLabelOp, color: '#8bb8a8', fontSize: 19, fontWeight: 600, fontFamily: FONT.sans, letterSpacing: 2, marginBottom: 16 }}>
                    핵심 요약
                  </div>
                  <div style={{ opacity: summaryBodyOp, borderLeft: '4px solid rgba(139,184,168,0.4)', paddingLeft: 24, fontFamily: FONT.sans }}>
                    <KoreanTypewriter text={book.summary} startFrame={summaryBodyIn} spreadFrames={summaryFrames - 15} color="#d0d0d0" fontSize={27} style={{ lineHeight: 1.8 }} />
                  </div>
                </div>

                {/* 경위 블록 */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                    <div style={{ opacity: contextLabelOp, color: '#999', fontSize: 19, fontWeight: 600, fontFamily: FONT.sans, letterSpacing: 2, marginBottom: 16 }}>
                      추천 및 감상경위
                    </div>
                    <div style={{ opacity: contextBodyOp, borderLeft: '4px solid rgba(153,153,153,0.3)', paddingLeft: 24, fontFamily: FONT.sans, marginBottom: hasQuote ? 24 : 0 }}>
                      <KoreanTypewriter text={book.context} startFrame={contextBodyIn} spreadFrames={contextFrames - 15} color="#bbb" fontSize={27} style={{ lineHeight: 1.8 }} />
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
                        <KoreanTypewriter text={contextAfterText} startFrame={contextAfterStart} spreadFrames={contextAfterFrames - 15} color="#bbb" fontSize={27} style={{ lineHeight: 1.8 }} />
                      </div>
                    )}
                  </div>
              </div>
              </div>{/* /wrapper */}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
