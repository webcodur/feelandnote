import { Img, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'
import { alexander } from '../data'

/** BRIDGE 장면: 실제 아바타가 들어간 서비스 UI 카드 (150프레임 확장) */
export const UIPreview: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const cardScale = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 100 } })
  const cardOpacity = interpolate(frame, [5, 25, 125, 145], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const avatarOpacity = interpolate(frame, [12, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const nameOpacity = interpolate(frame, [18, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const quoteOpacity = interpolate(frame, [28, 42], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const statsOpacity = interpolate(frame, [42, 56], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const booksOpacity = interpolate(frame, [56, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // 스탯 바 애니메이션
  const statsFill = interpolate(frame, [48, 72], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div
      style={{
        position: 'absolute',
        top: '8%',
        left: '50%',
        transform: `translateX(-50%) scale(${cardScale})`,
        opacity: cardOpacity,
      }}
    >
      {/* 메인 UI 카드 */}
      <div
        style={{
          width: 420,
          background: 'rgba(16,14,12,0.97)',
          border: '1px solid rgba(200,164,110,0.12)',
          borderRadius: 14,
          padding: 28,
          boxShadow: '0 16px 60px rgba(0,0,0,0.7), 0 0 40px rgba(200,164,110,0.05)',
        }}
      >
        {/* 헤더: 아바타 + 이름 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid rgba(200,164,110,0.25)',
              opacity: avatarOpacity,
              flexShrink: 0,
            }}
          >
            <Img src={alexander.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ opacity: nameOpacity }}>
            <div style={{ color: '#e8e0d0', fontSize: 18, fontWeight: 600, fontFamily: "'MaruBuri', serif" }}>
              {alexander.nickname}
            </div>
            <div style={{ color: '#666', fontSize: 12, fontFamily: "'Cormorant Garamond', serif", marginTop: 2, letterSpacing: 0.5 }}>
              {alexander.nickname_en} · 356–323 BC
            </div>
          </div>
        </div>

        {/* 명언 카드 */}
        <div
          style={{
            background: 'rgba(200,164,110,0.04)',
            border: '1px solid rgba(200,164,110,0.08)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 16,
            opacity: quoteOpacity,
          }}
        >
          <div style={{ color: '#c8a46e', fontSize: 10, fontFamily: "'Cinzel', serif", marginBottom: 8, letterSpacing: 2, fontWeight: 600 }}>
            QUOTE
          </div>
          <div style={{ color: '#bbb', fontSize: 13, fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', lineHeight: 1.6 }}>
            "{alexander.quote}"
          </div>
        </div>

        {/* 스탯 바 */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, opacity: statsOpacity }}>
          {[
            { label: '정치', value: 0.9 },
            { label: '전략', value: 0.95 },
            { label: '문화', value: 0.6 },
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ color: '#666', fontSize: 10, fontFamily: "'MaruBuri', serif", marginBottom: 4 }}>{label}</div>
              <div style={{ height: 4, background: 'rgba(200,164,110,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${value * statsFill * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, rgba(200,164,110,0.3), rgba(200,164,110,0.6))',
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 읽은 책 */}
        <div style={{ opacity: booksOpacity }}>
          <div style={{ color: '#666', fontSize: 10, fontFamily: "'Cinzel', serif", marginBottom: 8, letterSpacing: 2 }}>
            READING
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['일리아스', '키루스의 교육', '아이스킬로스 비극'].map((title) => (
              <div
                key={title}
                style={{
                  background: 'rgba(200,164,110,0.06)',
                  border: '1px solid rgba(200,164,110,0.08)',
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: '#999',
                  fontSize: 11,
                  fontFamily: "'MaruBuri', serif",
                }}
              >
                {title}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
