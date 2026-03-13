import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookEntry, CelebHost } from './types'
import { KoreanTypewriter } from './KoreanTypewriter'
import { FONT } from './fonts'

const TITLE_SUMMARY_GAP = 25
const SUMMARY_CONTEXT_GAP = 25
const CONTEXT_QUOTE_GAP = 20
const QUOTE_CONTEXTAFTER_GAP = 20

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
}

export const BookCard: React.FC<Props> = ({
  book, host, index, totalFrames, titleFrames, summaryFrames, summaryEnd,
  contextFrames, contextEnd, hasQuote, quoteFrames, hasContextAfter, contextAfterFrames, contextAfterText, totalBooks,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  if (frame < 0 || frame > totalFrames) return null

  // --- 페이즈 경계 ---
  const summaryStart = titleFrames + TITLE_SUMMARY_GAP
  const contextStart = summaryEnd + SUMMARY_CONTEXT_GAP
  const quoteStart = hasQuote ? contextEnd + CONTEXT_QUOTE_GAP : totalFrames
  const contextAfterStart = hasContextAfter ? quoteStart + quoteFrames + QUOTE_CONTEXTAFTER_GAP : totalFrames

  type Phase = 'summary' | 'context' | 'quote' | 'contextAfter'
  const phase: Phase = (() => {
    if (frame < contextStart) return 'summary'
    if (frame < quoteStart) return 'context'
    if (hasContextAfter && frame >= contextAfterStart) return 'contextAfter'
    if (hasQuote) return 'quote'
    return 'context'
  })()

  // --- 공통 ---
  const fadeOut = interpolate(frame, [totalFrames - 30, totalFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // --- 등장 ---
  const coverEnter = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 160 } })
  const coverY = interpolate(frame, [0, 15], [30, 0], { extrapolateRight: 'clamp' })
  const infoOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' })

  // --- 크로스페이드 ---
  const summaryOpacity = (() => {
    if (phase === 'summary') return interpolate(frame, [summaryStart + 10, summaryStart + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    if (phase === 'context') return interpolate(frame, [contextStart, contextStart + 25], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    return 0
  })()

  const contextOpacity = (() => {
    if (phase === 'summary') return 0
    if (phase === 'context') return interpolate(frame, [contextStart + 10, contextStart + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    return interpolate(frame, [quoteStart, quoteStart + 25], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  })()

  const quoteOpacity = (() => {
    if (phase === 'quote') return interpolate(frame, [quoteStart + 10, quoteStart + 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    if (phase === 'contextAfter') return interpolate(frame, [contextAfterStart, contextAfterStart + 25], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    return 0
  })()

  const contextAfterOpacity = phase === 'contextAfter'
    ? interpolate(frame, [contextAfterStart + 10, contextAfterStart + 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>
      {/* 상단 번호 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '40px 120px 0', opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <div style={{ color: '#c8a46e', fontSize: 16, fontFamily: FONT.cinzel, letterSpacing: 3, fontWeight: 600 }}>
          {index + 1}/{totalBooks}. [{book.title}]
        </div>
      </div>

      {/* 메인 레이아웃 */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 120px 0', gap: 80 }}>
        {/* 좌측: 표지 */}
        <div style={{ flexShrink: 0, position: 'relative', opacity: coverEnter, transform: `translateY(${coverY}px) scale(${coverEnter})` }}>
          <div style={{ width: 280, height: 420, borderRadius: 10, overflow: 'hidden', boxShadow: '0 25px 70px rgba(0,0,0,0.6), 0 0 40px rgba(200,164,110,0.08)' }}>
            <Img src={book.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* 우측: 정보 + 화자 */}
        <div style={{ flex: 1, maxWidth: 850, display: 'flex', flexDirection: 'column' }}>
          {/* 책 메타 */}
          <div style={{ opacity: infoOpacity }}>
            <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.sans, marginBottom: 6 }}>{book.creator}</div>
            <div style={{ color: '#e8e0d0', fontSize: 40, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.3, marginBottom: 6 }}>
              「{book.title}」
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              {book.source && <div style={{ color: '#666', fontSize: 14, fontFamily: FONT.sans }}>{book.source}</div>}
              {book.stats.publisher && (
                <><div style={{ color: '#444', fontSize: 14 }}>·</div><div style={{ color: '#666', fontSize: 14, fontFamily: FONT.sans }}>{book.stats.publisher}</div></>
              )}
              {book.stats.publishYear && (
                <><div style={{ color: '#444', fontSize: 14 }}>·</div><div style={{ color: '#666', fontSize: 14, fontFamily: FONT.sans }}>{book.stats.publishYear}</div></>
              )}
            </div>

            {book.stats.celebCount > 1 && (
              <div style={{ opacity: interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), marginBottom: 16 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(200,164,110,0.1)', border: '1px solid rgba(200,164,110,0.2)', borderRadius: 6, padding: '6px 14px' }}>
                  <div style={{ color: '#c8a46e', fontSize: 14, fontFamily: FONT.sans, fontWeight: 600 }}>{book.stats.celebCount}명의 거장이 읽었다</div>
                </div>
                {book.stats.celebNames.length > 0 && (
                  <div style={{ color: '#777', fontSize: 13, fontFamily: FONT.sans, marginTop: 6, lineHeight: 1.6 }}>
                    {book.stats.celebNames.slice(0, 6).join(', ')}
                    {book.stats.celebNames.length > 6 && ` 외 ${book.stats.celebNames.length - 6}명`}
                  </div>
                )}
              </div>
            )}

            <div style={{ width: interpolate(frame, [25, 45], [0, 400], { extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.3, marginBottom: 24 }} />
          </div>

          {/* 화자 영역 — 요약 / 맥락 / 인용 */}
          <div style={{ position: 'relative', minHeight: 200 }}>
            {/* Phase 1: 요약맨 */}
            {summaryOpacity > 0 && (
              <div style={{ opacity: summaryOpacity }}>
                <div style={{ color: '#8bb8a8', fontSize: 13, fontWeight: 600, fontFamily: FONT.sans, letterSpacing: 2, marginBottom: 12 }}>
                  핵심 요약
                </div>
                <div style={{ borderLeft: '3px solid rgba(139,184,168,0.4)', paddingLeft: 20, fontFamily: FONT.sans }}>
                  <KoreanTypewriter text={book.summary} startFrame={summaryStart + 15} spreadFrames={summaryFrames - 30} color="#d0d0d0" fontSize={22} style={{ lineHeight: 1.8 }} />
                </div>
              </div>
            )}

            {/* Phase 2: 나레이터 맥락 */}
            {contextOpacity > 0 && (
              <div style={{ position: phase === 'summary' ? 'absolute' : 'relative', top: 0, left: 0, right: 0, opacity: contextOpacity }}>
                <div style={{ color: '#999', fontSize: 13, fontWeight: 600, fontFamily: FONT.sans, letterSpacing: 2, marginBottom: 12 }}>
                  추천 경위
                </div>
                <div style={{ borderLeft: '3px solid rgba(153,153,153,0.3)', paddingLeft: 20, fontFamily: FONT.sans }}>
                  <KoreanTypewriter text={book.context} startFrame={contextStart + 15} spreadFrames={contextFrames - 30} color="#bbb" fontSize={22} style={{ lineHeight: 1.8 }} />
                </div>
              </div>
            )}

            {/* Phase 3: 셀럽 직접 인용 (있을 때만) */}
            {hasQuote && quoteOpacity > 0 && book.directQuote && (
              <div style={{ position: (phase !== 'quote' && phase !== 'contextAfter') ? 'absolute' : 'relative', top: 0, left: 0, right: 0, opacity: quoteOpacity }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '2px solid #c8a46e', boxShadow: '0 0 20px rgba(200,164,110,0.2)', flexShrink: 0 }}>
                    <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ color: '#e8e0d0', fontSize: 22, fontWeight: 700, fontFamily: FONT.sans }}>{host.nickname}</div>
                    <div style={{ color: '#777', fontSize: 14, fontFamily: FONT.cormorant }}>{host.nickname_en}</div>
                  </div>
                </div>
                <div style={{ borderLeft: '3px solid rgba(200,164,110,0.5)', paddingLeft: 24 }}>
                  <div style={{ color: '#e8e0d0', fontSize: 32, fontWeight: 700, fontFamily: FONT.serif, fontStyle: 'italic', lineHeight: 1.6 }}>
                    "{book.directQuote}"
                  </div>
                  {book.directQuoteSource && (
                    <div style={{ color: '#888', fontSize: 14, fontFamily: FONT.sans, marginTop: 12 }}>
                      — {book.directQuoteSource}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Phase 4: 후속 맥락 (있을 때만) */}
            {hasContextAfter && contextAfterOpacity > 0 && contextAfterText && (
              <div style={{ position: phase !== 'contextAfter' ? 'absolute' : 'relative', top: 0, left: 0, right: 0, opacity: contextAfterOpacity }}>
                <div style={{ borderLeft: '3px solid rgba(153,153,153,0.3)', paddingLeft: 20, fontFamily: FONT.sans }}>
                  <KoreanTypewriter text={contextAfterText} startFrame={contextAfterStart + 15} spreadFrames={contextAfterFrames - 30} color="#bbb" fontSize={22} style={{ lineHeight: 1.8 }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
