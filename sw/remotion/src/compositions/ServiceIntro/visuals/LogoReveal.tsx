import { interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion'

/** CTA 장면: 로고 + 기둥 + 광선 연출 */
export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 좌우 기둥
  const pillarH = interpolate(frame, [0, 40], [0, 250], { extrapolateRight: 'clamp' })
  const pillarOpacity = interpolate(frame, [0, 25], [0, 0.2], { extrapolateRight: 'clamp' })

  // 상단 빔
  const beamWidth = interpolate(frame, [30, 60], [0, 400], { extrapolateRight: 'clamp' })
  const beamOpacity = interpolate(frame, [30, 50], [0, 0.15], { extrapolateRight: 'clamp' })

  // 중심 광선
  const rayOpacity = interpolate(frame, [40, 65], [0, 0.2], { extrapolateRight: 'clamp' })
  const rayPulse = Math.sin(frame * 0.03) * 0.05 + 0.15

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* 왼쪽 기둥 */}
      <div
        style={{
          position: 'absolute',
          left: 'calc(50% - 220px)',
          bottom: 'calc(50% - 125px)',
          width: 16,
          height: pillarH,
          background: 'linear-gradient(0deg, rgba(200,164,110,0.08), rgba(200,164,110,0.15))',
          opacity: pillarOpacity,
          borderRadius: '3px 3px 0 0',
        }}
      />
      {/* 오른쪽 기둥 */}
      <div
        style={{
          position: 'absolute',
          right: 'calc(50% - 220px)',
          bottom: 'calc(50% - 125px)',
          width: 16,
          height: pillarH,
          background: 'linear-gradient(0deg, rgba(200,164,110,0.08), rgba(200,164,110,0.15))',
          opacity: pillarOpacity,
          borderRadius: '3px 3px 0 0',
        }}
      />

      {/* 상단 빔 (삼각 페디먼트) */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(50% - 130px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: `${beamWidth / 2}px solid transparent`,
          borderRight: `${beamWidth / 2}px solid transparent`,
          borderBottom: `40px solid rgba(200,164,110,${beamOpacity})`,
        }}
      />

      {/* 중심 하강 광선 */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(50% - 90px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 2,
          height: 80,
          background: `linear-gradient(180deg, rgba(200,164,110,${rayOpacity + rayPulse}), transparent)`,
        }}
      />

      {/* 바닥 반사 */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(50% - 140px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 300,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(200,164,110,0.12), transparent)',
          opacity: pillarOpacity,
        }}
      />
    </div>
  )
}
