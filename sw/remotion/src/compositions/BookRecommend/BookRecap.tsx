import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookEntry, CelebHost } from './types'
import { safeImg } from './utils'
import { FONT } from './fonts'
import { f } from './timing'

type Props = {
  books: BookEntry[]
  host: CelebHost
  totalFrames: number
  /** 헤더 라벨 (기본: "{NAME}'S BOOKSHELF") */
  label?: string
}

/**
 * 그리드 행 분배: 6권 이상 시 2행, 홀수면 아래 행이 1권 더 많다.
 * 1-5: [books], 6: [3,3], 7: [3,4], 8: [4,4], 9: [4,5], 10: [5,5]
 */
function splitRows(count: number): [number, number] {
  if (count <= 5) return [count, 0]
  const top = Math.floor(count / 2)
  return [top, count - top]
}

/**
 * 리캡: 표지 + 제목 그리드. 6권 이상 시 2행 배치.
 */
export const BookRecap: React.FC<Props> = ({ books, host, totalFrames, label }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const count = books.length
  const [topCount, bottomCount] = splitRows(count)
  const isGrid = bottomCount > 0
  const maxCols = isGrid ? Math.max(topCount, bottomCount) : count

  // 카드 크기 (열 수에 따라 축소)
  const thumbW = maxCols >= 5 ? 120 : maxCols >= 4 ? 140 : 180
  const thumbH = Math.round(thumbW * 1.5)
  const titleSize = maxCols >= 5 ? 15 : maxCols >= 4 ? 17 : 20
  const creatorSize = maxCols >= 5 ? 11 : maxCols >= 4 ? 12 : 14
  const oneLinerSize = maxCols >= 5 ? 12 : maxCols >= 4 ? 13 : 15
  const cardGap = maxCols >= 5 ? 28 : maxCols >= 4 ? 36 : 60
  const cardMaxWidth = maxCols >= 5 ? 220 : maxCols >= 4 ? 260 : 300
  const showOneLiner = !isGrid // 2행일 때는 한줄 요약 생략

  // 전체 페이드
  const fadeIn = interpolate(frame, [0, f(0.83)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [totalFrames - f(0.83), totalFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const opacity = fadeIn * fadeOut

  // 상단 라벨
  const labelOpacity = interpolate(frame, [f(0.17), f(0.67)], [0, 1], { extrapolateRight: 'clamp' })
  const lineWidth = interpolate(frame, [f(0.33), f(1.33)], [0, 200], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  const headerText = label ?? `${host.nickname_en.toUpperCase()}'S BOOKSHELF`

  const renderCard = (book: BookEntry, globalIndex: number) => {
    const delay = globalIndex * f(0.27)
    const enter = spring({ frame: Math.max(0, frame - f(0.5) - delay), fps, config: { damping: 14, stiffness: 140 } })
    const y = interpolate(frame, [f(0.5) + delay, f(1) + delay], [20, 0], { extrapolateRight: 'clamp' })
    const quoteOpacity = interpolate(frame, [f(1.33) + delay, f(2) + delay], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })

    return (
      <div
        key={globalIndex}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: cardMaxWidth,
          opacity: enter,
          transform: `translateY(${y}px)`,
        }}
      >
        {/* 표지 */}
        <div
          style={{
            width: thumbW,
            height: thumbH,
            borderRadius: 6,
            overflow: 'hidden',
            boxShadow: '0 15px 50px rgba(0,0,0,0.5), 0 0 30px rgba(200,164,110,0.06)',
            marginBottom: isGrid ? 10 : 20,
          }}
        >
          <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* 제목 */}
        <div
          style={{
            color: '#e8e0d0',
            fontSize: titleSize,
            fontWeight: 700,
            fontFamily: FONT.serif,
            textAlign: 'center',
            marginBottom: 2,
            lineHeight: 1.3,
            maxWidth: cardMaxWidth - 10,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {book.title}
        </div>

        {/* 저자 */}
        <div
          style={{
            color: '#888',
            fontSize: creatorSize,
            fontFamily: FONT.sans,
            textAlign: 'center',
            marginBottom: showOneLiner ? 14 : 0,
          }}
        >
          {book.creator}
        </div>

        {/* 한줄 요약 — 1행 레이아웃에서만 표시 */}
        {showOneLiner && (
          <div style={{ opacity: quoteOpacity, textAlign: 'center' }}>
            <div
              style={{
                color: '#c8a46e',
                fontSize: oneLinerSize,
                fontFamily: FONT.serif,
                lineHeight: 1.6,
                borderTop: '1px solid rgba(200, 164, 110, 0.2)',
                paddingTop: 12,
              }}
            >
              &ldquo;{book.oneLiner}&rdquo;
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderRow = (rowBooks: BookEntry[], startIndex: number) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: cardGap,
      }}
    >
      {rowBooks.map((book, i) => renderCard(book, startIndex + i))}
    </div>
  )

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
          {headerText}
        </div>
        <div style={{ width: lineWidth, height: 1, backgroundColor: '#c8a46e', opacity: 0.4 }} />
      </div>

      {/* 책 그리드 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isGrid ? 24 : 0,
          padding: isGrid ? '90px 60px 40px' : '80px 80px 60px',
        }}
      >
        {isGrid ? (
          <>
            {renderRow(books.slice(0, topCount), 0)}
            {renderRow(books.slice(topCount), topCount)}
          </>
        ) : (
          renderRow(books, 0)
        )}
      </div>
    </div>
  )
}
