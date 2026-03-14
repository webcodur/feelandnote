import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'

/** CTA 장면: 로고 + 기둥 + 광선 연출 (강화 버전) */
export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 좌우 기둥
  const pillarH = interpolate(frame, [0, 40], [0, 300], { extrapolateRight: 'clamp' })
  const pillarOpacity = interpolate(frame, [0, 25], [0, 0.35], { extrapolateRight: 'clamp' })

  // 상단 빔 (삼각 페디먼트)
  const beamWidth = interpolate(frame, [30, 60], [0, 480], { extrapolateRight: 'clamp' })
  const beamOpacity = interpolate(frame, [30, 50], [0, 0.25], { extrapolateRight: 'clamp' })

  // 중심 하강 광선
  const rayOpacity = interpolate(frame, [40, 65], [0, 0.35], { extrapolateRight: 'clamp' })
  const rayPulse = Math.sin(frame * 0.03) * 0.08 + 0.2
  const rayH = interpolate(frame, [40, 70], [0, 120], { extrapolateRight: 'clamp' })

  // 좌우 보조 광선
  const sideRayOpacity = interpolate(frame, [55, 80], [0, 0.15], { extrapolateRight: 'clamp' })

  // 기둥 캡 (상단 장식)
  const capScale = spring({ frame: Math.max(0, frame - 35), fps, config: { damping: 12, stiffness: 100 } })

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* 왼쪽 기둥 */}
      <div
        style={{
          position: 'absolute',
          left: 'calc(50% - 260px)',
          bottom: 'calc(50% - 150px)',
          width: 20,
          height: pillarH,
          background: 'linear-gradient(0deg, rgba(200,164,110,0.12), rgba(200,164,110,0.25))',
          opacity: pillarOpacity,
          borderRadius: '3px 3px 0 0',
        }}
      />
      {/* 왼쪽 기둥 캡 */}
      <div
        style={{
          position: 'absolute',
          left: 'calc(50% - 268px)',
          bottom: `calc(50% - 150px + ${pillarH}px)`,
          width: 36,
          height: 8,
          background: 'rgba(200,164,110,0.2)',
          opacity: pillarOpacity,
          borderRadius: 2,
          transform: `scaleX(${capScale})`,
        }}
      />

      {/* 오른쪽 기둥 */}
      <div
        style={{
          position: 'absolute',
          right: 'calc(50% - 260px)',
          bottom: 'calc(50% - 150px)',
          width: 20,
          height: pillarH,
          background: 'linear-gradient(0deg, rgba(200,164,110,0.12), rgba(200,164,110,0.25))',
          opacity: pillarOpacity,
          borderRadius: '3px 3px 0 0',
        }}
      />
      {/* 오른쪽 기둥 캡 */}
      <div
        style={{
          position: 'absolute',
          right: 'calc(50% - 268px)',
          bottom: `calc(50% - 150px + ${pillarH}px)`,
          width: 36,
          height: 8,
          background: 'rgba(200,164,110,0.2)',
          opacity: pillarOpacity,
          borderRadius: 2,
          transform: `scaleX(${capScale})`,
        }}
      />

      {/* 상단 빔 (삼각 페디먼트) */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(50% - 155px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${beamWidth / 2}px solid transparent`,
          borderRight: `${beamWidth / 2}px solid transparent`,
          borderBottom: `50px solid rgba(200,164,110,${beamOpacity})`,
        }}
      />

      {/* 중심 하강 광선 */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(50% - 105px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 3,
          height: rayH,
          background: `linear-gradient(180deg, rgba(200,164,110,${rayOpacity + rayPulse}), transparent)`,
          boxShadow: `0 0 20px rgba(200,164,110,${rayPulse * 0.5})`,
        }}
      />

      {/* 좌우 보조 광선 */}
      {[-1, 1].map((dir) => (
        <div
          key={dir}
          style={{
            position: 'absolute',
            top: 'calc(50% - 90px)',
            left: `calc(50% + ${dir * 60}px)`,
            width: 1,
            height: rayH * 0.6,
            background: `linear-gradient(180deg, rgba(200,164,110,${sideRayOpacity}), transparent)`,
            transform: `rotate(${dir * 8}deg)`,
            transformOrigin: 'top center',
          }}
        />
      ))}

      {/* 바닥 반사 */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(50% - 165px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 400,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(200,164,110,0.18), transparent)',
          opacity: pillarOpacity,
        }}
      />

      {/* 앰비언트 글로우 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(200,164,110,${rayPulse * 0.06}) 0%, transparent 70%)`,
        }}
      />
    </div>
  )
}
