import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookEntry, CelebHost } from './types'
import { safeImg } from './utils'
import { KoreanTypewriter } from './KoreanTypewriter'
import { FONT } from './fonts'
import {
  TITLE_SUMMARY_GAP, SUMMARY_CONTEXT_GAP, CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  PRE_LABEL_GAP, LABEL_FRAMES, POST_LABEL_GAP,
} from './timing'

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

  // --- 공통 ---
  const fadeOut = interpolate(frame, [totalFrames - 30, totalFrames], [1, 0], CLAMP)

  // --- 등장 ---
  const coverEnter = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 160 } })
  const coverY = interpolate(frame, [0, 15], [30, 0], { extrapolateRight: 'clamp' })
  const infoOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' })

  // ===== 레이블 → 본문 타이밍 =====
  // 흐름: 이전 끝 → PRE_LABEL_GAP → 라벨(시각+음성) → POST_LABEL_GAP → 본문(시각+음성)

  // -- 요약 구간 --
  const summaryLabelIn = titleFrames + PRE_LABEL_GAP          // 라벨 등장 = 제목 끝 + 무음
  const summaryFadeOut = summaryEnd + PRE_LABEL_GAP            // 요약 전체 페이드아웃 (경위 라벨과 동시)

  const summaryLabelOpacity = interpolate(frame,
    [summaryLabelIn, summaryLabelIn + 15, summaryFadeOut, summaryFadeOut + 15],
    [0, 1, 1, 0], CLAMP)

  const summaryBodyOpacity = interpolate(frame,
    [summaryStart, summaryStart + 20, summaryFadeOut, summaryFadeOut + 15],
    [0, 1, 1, 0], CLAMP)

  // -- 경위 구간 --
  const contextLabelIn = summaryEnd + PRE_LABEL_GAP            // 라벨 등장 = 요약 끝 + 무음

  const contextLabelOpacity = interpolate(frame,
    [contextLabelIn, contextLabelIn + 15],
    [0, 1], CLAMP)

  const contextBodyOpacity = interpolate(frame,
    [contextStart, contextStart + 20],
    [0, 1], CLAMP)

  // 인용문
  const quoteOpacity = hasQuote
    ? interpolate(frame, [quoteStart + 5, quoteStart + 30], [0, 1], CLAMP)
    : 0

  // 후속 맥락
  const contextAfterOpacity = hasContextAfter
    ? interpolate(frame, [contextAfterStart + 5, contextAfterStart + 30], [0, 1], CLAMP)
    : 0

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>
      {/* 상단 번호 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '40px 120px 0', opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }) }}>
        <div style={{ color: '#c8a46e', fontSize: 16, fontFamily: FONT.cinzel, letterSpacing: 3, fontWeight: 600 }}>
          {index + 1}/{totalBooks}. [{book.title}]
        </div>
      </div>

      {/* 메인 레이아웃 — 중앙 정렬, 고정 높이로 안정 */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 120px 60px', gap: 80 }}>
        {/* 좌측: 표지 */}
        <div style={{ flexShrink: 0, position: 'relative', opacity: coverEnter, transform: `translateY(${coverY}px) scale(${coverEnter})` }}>
          <div style={{ width: 280, height: 420, borderRadius: 10, overflow: 'hidden', boxShadow: '0 25px 70px rgba(0,0,0,0.6), 0 0 40px rgba(200,164,110,0.08)' }}>
            <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* 우측: 정보 + 본문 */}
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
                <><div style={{ color: '#444', fontSize: 14 }}>·</div><div style={{ color: '#666', fontSize: 14, fontFamily: FONT.sans }}>{book.stats.publishYear?.startsWith('기원전') ? book.stats.publishYear : `${book.stats.publishYear}년 집필`}</div></>
              )}
            </div>

            <div style={{ width: interpolate(frame, [25, 45], [0, 400], { extrapolateRight: 'clamp' }), height: 1, backgroundColor: '#c8a46e', opacity: 0.3, marginBottom: 24 }} />
          </div>

          {/* 본문 영역 — 고정 높이, 두 블록 겹침 (opacity로 전환) */}
          <div style={{ position: 'relative', height: 420 }}>
            {/* 요약 블록 — 항상 렌더링 */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
              <div style={{ opacity: summaryLabelOpacity, color: '#8bb8a8', fontSize: 15, fontWeight: 600, fontFamily: FONT.sans, letterSpacing: 2, marginBottom: 14 }}>
                핵심 요약
              </div>
              <div style={{ opacity: summaryBodyOpacity, borderLeft: '3px solid rgba(139,184,168,0.4)', paddingLeft: 20, fontFamily: FONT.sans }}>
                <KoreanTypewriter text={book.summary} startFrame={summaryStart} spreadFrames={summaryFrames - 15} color="#d0d0d0" fontSize={22} style={{ lineHeight: 1.8 }} />
              </div>
            </div>

            {/* 경위 블록 — 항상 렌더링 */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
              <div style={{ opacity: contextLabelOpacity, color: '#999', fontSize: 15, fontWeight: 600, fontFamily: FONT.sans, letterSpacing: 2, marginBottom: 14 }}>
                추천 및 감상경위
              </div>
              <div style={{ opacity: contextBodyOpacity, borderLeft: '3px solid rgba(153,153,153,0.3)', paddingLeft: 20, fontFamily: FONT.sans, marginBottom: hasQuote ? 20 : 0 }}>
                <KoreanTypewriter text={book.context} startFrame={contextStart} spreadFrames={contextFrames - 15} color="#bbb" fontSize={22} style={{ lineHeight: 1.8 }} />
              </div>

              {hasQuote && book.directQuote && (
                <div style={{ opacity: quoteOpacity, borderLeft: '3px solid rgba(200,164,110,0.5)', paddingLeft: 20, marginBottom: hasContextAfter ? 20 : 0 }}>
                  <div style={{ color: '#c8a46e', fontSize: 24, fontWeight: 700, fontFamily: FONT.serif, lineHeight: 1.6 }}>
                    "{book.directQuote}"
                  </div>
                  <div style={{ color: '#888', fontSize: 13, fontFamily: FONT.sans, marginTop: 6 }}>
                    — {host.nickname}{book.directQuoteSource ? `, ${book.directQuoteSource}` : ''}
                  </div>
                </div>
              )}

              {hasContextAfter && contextAfterText && (
                <div style={{ opacity: contextAfterOpacity, borderLeft: '3px solid rgba(153,153,153,0.3)', paddingLeft: 20, fontFamily: FONT.sans }}>
                  <KoreanTypewriter text={contextAfterText} startFrame={contextAfterStart} spreadFrames={contextAfterFrames - 15} color="#bbb" fontSize={22} style={{ lineHeight: 1.8 }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
