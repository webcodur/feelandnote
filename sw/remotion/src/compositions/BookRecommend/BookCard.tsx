import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookEntry, CelebHost } from './types'
import { KoreanTypewriter } from './KoreanTypewriter'
import { FONT } from './fonts'

type Props = {
  book: BookEntry
  host: CelebHost
  index: number
  totalFrames: number
  narratorFrames: number
  totalBooks: number
}

export const BookCard: React.FC<Props> = ({ book, host, index, totalFrames, narratorFrames, totalBooks }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  if (frame < 0 || frame > totalFrames) return null

  const inNarratorPhase = frame < narratorFrames
  const celebLocal = frame - narratorFrames
  const celebFrames = totalFrames - narratorFrames

  // --- 공통 ---
  const fadeOut = interpolate(frame, [totalFrames - 30, totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // --- 등장 애니메이션 ---
  const coverEnter = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 160 } })
  const coverY = interpolate(frame, [0, 15], [30, 0], { extrapolateRight: 'clamp' })
  const infoOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' })
  const narratorTextOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' })

  // --- 화자 전환: 나레이터 텍스트 fadeOut → 셀럽 영역 fadeIn ---
  const speakerNarratorOpacity = inNarratorPhase
    ? narratorTextOpacity
    : interpolate(celebLocal, [0, 25], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const speakerCelebOpacity = !inNarratorPhase
    ? interpolate(celebLocal, [15, 45], [0, 1], { extrapolateRight: 'clamp' })
    : 0

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeOut }}>
      {/* 상단 번호 라벨 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '40px 120px 0',
          opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <div style={{ color: '#c8a46e', fontSize: 16, fontFamily: FONT.cinzel, letterSpacing: 3, fontWeight: 600 }}>
          {index + 1}/{totalBooks}. [{book.title}]
        </div>
      </div>

      {/* 메인 레이아웃: 좌측 표지 + 우측 정보 (통째로 유지) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 120px 0',
          gap: 80,
        }}
      >
        {/* ===== 좌측: 표지 (항상 유지) ===== */}
        <div
          style={{
            flexShrink: 0,
            position: 'relative',
            opacity: coverEnter,
            transform: `translateY(${coverY}px) scale(${coverEnter})`,
          }}
        >
          <div
            style={{
              width: 280,
              height: 420,
              borderRadius: 10,
              overflow: 'hidden',
              boxShadow: '0 25px 70px rgba(0,0,0,0.6), 0 0 40px rgba(200,164,110,0.08)',
            }}
          >
            <Img src={book.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* ===== 우측: 책 정보(유지) + 화자 영역(전환) ===== */}
        <div style={{ flex: 1, maxWidth: 850, display: 'flex', flexDirection: 'column' }}>
          {/* 책 메타 정보 — 항상 표시 */}
          <div style={{ opacity: infoOpacity }}>
            <div style={{ color: '#c8a46e', fontSize: 18, fontFamily: FONT.sans, marginBottom: 6 }}>
              {book.creator}
            </div>
            <div
              style={{
                color: '#e8e0d0',
                fontSize: 40,
                fontWeight: 700,
                fontFamily: FONT.serif,
                lineHeight: 1.3,
                marginBottom: 6,
              }}
            >
              「{book.title}」
            </div>
            {book.source && (
              <div style={{ color: '#666', fontSize: 15, fontFamily: FONT.sans, marginBottom: 20 }}>
                — {book.source}
              </div>
            )}
            <div
              style={{
                width: interpolate(frame, [25, 45], [0, 400], { extrapolateRight: 'clamp' }),
                height: 1,
                backgroundColor: '#c8a46e',
                opacity: 0.3,
                marginBottom: 24,
              }}
            />
          </div>

          {/* 화자 영역 — 나레이터 / 셀럽 크로스페이드 */}
          <div style={{ position: 'relative', minHeight: 200 }}>
            {/* 나레이터 설명 */}
            {speakerNarratorOpacity > 0 && (
              <div style={{ opacity: speakerNarratorOpacity, fontFamily: FONT.sans }}>
                <KoreanTypewriter
                  text={book.narratorLine}
                  startFrame={40}
                  spreadFrames={narratorFrames - 60}
                  color="#ccc"
                  fontSize={22}
                  style={{ lineHeight: 1.8 }}
                />
              </div>
            )}

            {/* 셀럽 응답 */}
            {speakerCelebOpacity > 0 && (
              <div
                style={{
                  position: inNarratorPhase ? 'absolute' : 'relative',
                  top: 0,
                  left: 0,
                  right: 0,
                  opacity: speakerCelebOpacity,
                }}
              >
                {/* 셀럽 프로필 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid #c8a46e',
                      boxShadow: '0 0 20px rgba(200,164,110,0.2)',
                      flexShrink: 0,
                    }}
                  >
                    <Img src={host.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ color: '#e8e0d0', fontSize: 22, fontWeight: 700, fontFamily: FONT.sans }}>
                      {host.nickname}
                    </div>
                    <div style={{ color: '#777', fontSize: 14, fontFamily: FONT.cormorant }}>
                      {host.nickname_en}
                    </div>
                  </div>
                </div>

                {/* 응답 텍스트 */}
                <div style={{ borderLeft: '3px solid rgba(200,164,110,0.5)', paddingLeft: 20, fontFamily: FONT.serif }}>
                  <KoreanTypewriter
                    text={book.narration}
                    startFrame={narratorFrames + 20}
                    spreadFrames={celebFrames - 50}
                    color="#e8e0d0"
                    fontSize={24}
                    style={{ fontStyle: 'italic', lineHeight: 1.8 }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
