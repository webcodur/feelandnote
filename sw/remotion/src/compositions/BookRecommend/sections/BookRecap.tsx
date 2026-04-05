import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { BookEntry } from '../types'
import { safeImg, useIsPortrait } from '../utils'
import { FONT } from '../fonts'
import { f } from '../timing'

type Props = {
  books: BookEntry[]
  totalFrames: number
}

/**
 * 그리드 행 분배: 6권 이상 시 2행, 홀수면 아래 행이 1권 더 많다.
 */
function splitRows(count: number): [number, number] {
  if (count <= 5) return [count, 0]
  const top = Math.floor(count / 2)
  return [top, count - top]
}

const CL = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const }

/**
 * 리캡: 포스터형 그리드.
 */
export const BookRecap: React.FC<Props> = ({ books, totalFrames }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const portrait = useIsPortrait()

  const posterOp = interpolate(frame,
    [0, f(0.83), totalFrames - f(0.83), totalFrames],
    [0, 1, 1, 0], CL)

  const count = books.length
  const [topCount, bottomCount] = splitRows(count)
  const isGrid = bottomCount > 0
  const maxCols = isGrid ? Math.max(topCount, bottomCount) : count

  const thumbW = portrait
    ? (isGrid ? (maxCols >= 4 ? 140 : 170) : (maxCols >= 4 ? 130 : 160))
    : (isGrid ? (maxCols >= 5 ? 170 : maxCols >= 4 ? 195 : 230) : (maxCols >= 5 ? 150 : maxCols >= 4 ? 170 : 210))
  const thumbH = Math.round(thumbW * 1.5)
  const titleSize = portrait
    ? (isGrid ? (maxCols >= 4 ? 26 : 29) : (maxCols >= 4 ? 22 : 27))
    : (isGrid ? (maxCols >= 5 ? 30 : maxCols >= 4 ? 32 : 36) : (maxCols >= 5 ? 26 : maxCols >= 4 ? 28 : 34))
  const creatorSize = portrait
    ? (isGrid ? (maxCols >= 4 ? 20 : 22) : (maxCols >= 4 ? 18 : 21))
    : (isGrid ? (maxCols >= 5 ? 24 : maxCols >= 4 ? 26 : 28) : (maxCols >= 5 ? 22 : maxCols >= 4 ? 24 : 26))
  const cardGap = portrait
    ? (isGrid ? (maxCols >= 4 ? 14 : 20) : (maxCols >= 4 ? 12 : 16))
    : (isGrid ? (maxCols >= 5 ? 18 : maxCols >= 4 ? 24 : 34) : (maxCols >= 5 ? 14 : maxCols >= 4 ? 20 : 30))
  const cardMaxWidth = portrait
    ? (isGrid ? (maxCols >= 4 ? 310 : 340) : (maxCols >= 4 ? 280 : 320))
    : (isGrid ? (maxCols >= 5 ? 380 : maxCols >= 4 ? 420 : 460) : (maxCols >= 5 ? 340 : maxCols >= 4 ? 380 : 420))

  const renderCard = (book: BookEntry, globalIndex: number) => {
    const delay = globalIndex * f(0.27)
    const enter = spring({ frame: Math.max(0, frame - f(0.5) - delay), fps, config: { damping: 14, stiffness: 140 } })
    return (
      <div
        key={globalIndex}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          width: cardMaxWidth, maxWidth: cardMaxWidth, opacity: enter,
        }}
      >
        <div
          style={{
            width: thumbW, height: thumbH, borderRadius: 6, overflow: 'hidden',
            boxShadow: '0 15px 50px rgba(0,0,0,0.5), 0 0 30px rgba(200,164,110,0.06)',
            marginBottom: isGrid ? 10 : 20,
          }}
        >
          <Img src={safeImg(book.thumbnail_url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div
          style={{
            color: '#e8e0d0', fontSize: titleSize, fontWeight: 700,
            fontFamily: FONT.serif, textAlign: 'center', marginBottom: 2,
            lineHeight: 1.3, maxWidth: cardMaxWidth - 10, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}
        >
          {book.title}
        </div>
        <div style={{ color: '#888', fontSize: creatorSize, fontFamily: FONT.sans, textAlign: 'center' }}>
          {book.creator}
        </div>
      </div>
    )
  }

  const renderRow = (rowBooks: BookEntry[], startIndex: number) => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: cardGap }}>
      {rowBooks.map((book, i) => renderCard(book, startIndex + i))}
    </div>
  )

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {posterOp > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: posterOp }}>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'stretch', padding: portrait ? '60px 30px 60px' : '80px 40px 80px',
          }}>
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
      )}
    </div>
  )
}
