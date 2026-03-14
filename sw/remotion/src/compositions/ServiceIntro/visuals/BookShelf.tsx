import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'

/** CONNECT 장면: 책이 서재에 꽂히는 애니메이션 (확대 스케일) */
export const BookShelf: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const books = [
    { title: '일리아스', color: '#8a6a3a', h: 180, delay: 20 },
    { title: '안티고네', color: '#5a6a7a', h: 165, delay: 32 },
    { title: '오레스테이아', color: '#6a5a4a', h: 172, delay: 44 },
    { title: '파우스트', color: '#4a5a5a', h: 158, delay: 56 },
    { title: '신곡', color: '#7a5a3a', h: 175, delay: 68 },
  ]

  // 서가 선반
  const shelfOpacity = interpolate(frame, [10, 25, 140, 160], [0, 0.7, 0.7, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // "내 서재" 라벨
  const labelOpacity = interpolate(frame, [85, 100], [0, 0.8], { extrapolateRight: 'clamp' })
  const labelScale = spring({ frame: Math.max(0, frame - 85), fps, config: { damping: 12, stiffness: 120 } })

  return (
    <div style={{ position: 'absolute', bottom: '22%', left: '50%', transform: 'translateX(-50%)' }}>
      {/* 서가 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, position: 'relative' }}>
        {books.map((book, i) => {
          // 위에서 떨어져 내려옴
          const dropY = interpolate(frame, [book.delay, book.delay + 18], [-80, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          const bookOpacity = interpolate(frame, [book.delay, book.delay + 12, 140, 160], [0, 0.9, 0.9, 0], {
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
                width: 44,
                height: book.h,
                background: `linear-gradient(180deg, ${book.color}cc, ${book.color}88)`,
                borderRadius: '3px 3px 0 0',
                border: '1px solid rgba(255,255,255,0.06)',
                opacity: bookOpacity,
                transform: `translateY(${dropY}px) scaleY(${bookScale})`,
                transformOrigin: 'bottom',
                position: 'relative',
                boxShadow: '3px 0 12px rgba(0,0,0,0.3)',
              }}
            >
              {/* 책 제목 (세로) */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%) rotate(-90deg)',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 11,
                  fontFamily: "'MaruBuri', serif",
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
                  width: 5,
                  height: '100%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.1), transparent 60%)',
                  borderRadius: '3px 0 0 0',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* 선반 */}
      <div
        style={{
          width: 320,
          height: 5,
          background: 'linear-gradient(90deg, transparent 5%, rgba(200,164,110,0.25), transparent 95%)',
          marginTop: 0,
          opacity: shelfOpacity,
          borderRadius: 2,
        }}
      />

      {/* "내 서재" 라벨 */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 20,
          color: '#c8a46e',
          fontSize: 15,
          fontFamily: "'Cinzel', serif",
          letterSpacing: 4,
          opacity: labelOpacity,
          transform: `scale(${labelScale})`,
        }}
      >
        MY LIBRARY
      </div>
    </div>
  )
}
