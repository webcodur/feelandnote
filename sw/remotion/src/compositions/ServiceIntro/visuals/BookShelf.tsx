import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'

/** CONNECT 장면: 책이 서재에 꽂히는 애니메이션 */
export const BookShelf: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const books = [
    { title: '일리아스', color: '#8a6a3a', h: 130, delay: 20 },
    { title: '안티고네', color: '#5a6a7a', h: 120, delay: 35 },
    { title: '오레스테이아', color: '#6a5a4a', h: 125, delay: 50 },
    { title: '파우스트', color: '#4a5a5a', h: 115, delay: 65 },
    { title: '신곡', color: '#7a5a3a', h: 128, delay: 80 },
  ]

  // 서가 선반
  const shelfOpacity = interpolate(frame, [10, 25, 140, 160], [0, 0.6, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // "내 서재" 라벨
  const labelOpacity = interpolate(frame, [90, 105], [0, 0.7], { extrapolateRight: 'clamp' })
  const labelScale = spring({ frame: Math.max(0, frame - 90), fps, config: { damping: 12, stiffness: 120 } })

  return (
    <div style={{ position: 'absolute', bottom: '25%', left: '50%', transform: 'translateX(-50%)' }}>
      {/* 서가 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, position: 'relative' }}>
        {books.map((book, i) => {
          // 위에서 떨어져 내려옴
          const dropY = interpolate(frame, [book.delay, book.delay + 18], [-60, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const bookOpacity = interpolate(frame, [book.delay, book.delay + 12, 140, 160], [0, 0.85, 0.85, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const bookScale = spring({
            frame: Math.max(0, frame - book.delay),
            fps,
            config: { damping: 10, stiffness: 180 },
          })

          return (
            <div
              key={i}
              style={{
                width: 28,
                height: book.h,
                background: `linear-gradient(180deg, ${book.color}cc, ${book.color}88)`,
                borderRadius: '2px 2px 0 0',
                border: '1px solid rgba(255,255,255,0.06)',
                opacity: bookOpacity,
                transform: `translateY(${dropY}px) scaleY(${bookScale})`,
                transformOrigin: 'bottom',
                position: 'relative',
                boxShadow: '2px 0 8px rgba(0,0,0,0.3)',
              }}
            >
              {/* 책 제목 (세로) */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-90deg)',
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 8,
                  fontFamily: 'system-ui',
                  whiteSpace: 'nowrap',
                  letterSpacing: 1,
                }}
              >
                {book.title}
              </div>
              {/* 책등 빛 반사 */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: 4,
                  height: '100%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)',
                  borderRadius: '2px 0 0 0',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* 선반 */}
      <div
        style={{
          width: 200,
          height: 4,
          background: 'linear-gradient(90deg, transparent, rgba(200,164,110,0.2), transparent)',
          marginTop: 0,
          opacity: shelfOpacity,
          borderRadius: 2,
        }}
      />

      {/* "내 서재" 라벨 */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 16,
          color: '#c8a46e',
          fontSize: 13,
          fontFamily: 'system-ui',
          letterSpacing: 3,
          opacity: labelOpacity,
          transform: `scale(${labelScale})`,
        }}
      >
        MY LIBRARY
      </div>
    </div>
  )
}
