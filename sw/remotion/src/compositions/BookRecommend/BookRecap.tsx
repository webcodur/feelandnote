import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookEntry, CelebHost } from './types'
import { FONT } from './fonts'

type Props = {
  books: BookEntry[]
  host: CelebHost
  totalFrames: number
}

/**
 * 아웃트로 직전 리캡: 3권 표지 + 한줄 요약을 나란히 보여준다.
 */
export const BookRecap: React.FC<Props> = ({ books, host, totalFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 전체 페이드
  const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [totalFrames - 25, totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const opacity = fadeIn * fadeOut

  // 상단 라벨
  const labelOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: 'clamp' })
  const lineWidth = interpolate(frame, [10, 40], [0, 200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      {/* 상단 라벨 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '50px 0 0',
          opacity: labelOpacity,
          gap: 12,
        }}
      >
        <div style={{ color: '#c8a46e', fontSize: 16, fontFamily: FONT.cinzel, letterSpacing: 6, fontWeight: 600 }}>
          {host.nickname_en.toUpperCase()}'S BOOKSHELF
        </div>
        <div style={{ width: lineWidth, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
      </div>

      {/* 3권 카드 나란히 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 60,
          padding: '80px 80px 60px',
        }}
      >
        {books.map((book, i) => {
          const delay = i * 12
          const enter = spring({ frame: Math.max(0, frame - 15 - delay), fps, config: { damping: 14, stiffness: 140 } })
          const y = interpolate(frame, [15 + delay, 30 + delay], [20, 0], { extrapolateRight: 'clamp' })
          const quoteOpacity = interpolate(frame, [40 + delay, 60 + delay], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                maxWidth: 300,
                opacity: enter,
                transform: `translateY(${y}px)`,
              }}
            >
              {/* 표지 */}
              <div
                style={{
                  width: 180,
                  height: 270,
                  borderRadius: 8,
                  overflow: 'hidden',
                  boxShadow: '0 15px 50px rgba(0,0,0,0.5), 0 0 30px rgba(200,164,110,0.06)',
                  marginBottom: 20,
                }}
              >
                <Img src={book.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              {/* 제목 */}
              <div
                style={{
                  color: '#e8e0d0',
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: FONT.serif,
                  textAlign: 'center',
                  marginBottom: 4,
                }}
              >
                {book.title}
              </div>

              {/* 저자 */}
              <div
                style={{
                  color: '#888',
                  fontSize: 14,
                  fontFamily: FONT.sans,
                  textAlign: 'center',
                  marginBottom: 14,
                }}
              >
                {book.creator}
              </div>

              {/* 한줄 요약 — 머스크 어조 */}
              <div
                style={{
                  opacity: quoteOpacity,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    color: '#c8a46e',
                    fontSize: 15,
                    fontFamily: FONT.serif,
                    lineHeight: 1.6,
                    borderTop: '1px solid rgba(200, 164, 110, 0.2)',
                    paddingTop: 12,
                  }}
                >
                  "{book.oneLiner}"
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
