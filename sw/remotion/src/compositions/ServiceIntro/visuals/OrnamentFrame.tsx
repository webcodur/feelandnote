import { interpolate, useCurrentFrame } from 'remotion'

/** 고전 장식 테두리 프레임 — 화면 가장자리에 깔림 */
export const OrnamentFrame: React.FC<{ color?: string; delay?: number }> = ({
  color = '200, 164, 110',
  delay = 0,
}) => {
  const frame = useCurrentFrame()
  const f = Math.max(0, frame - delay)

  const opacity = interpolate(f, [0, 30], [0, 1], { extrapolateRight: 'clamp' })

  // 모서리 장식 길이
  const cornerLen = interpolate(f, [0, 40], [0, 80], { extrapolateRight: 'clamp' })

  // 테두리 선
  const borderProgress = interpolate(f, [10, 50], [0, 1], { extrapolateRight: 'clamp' })

  const pad = 40
  const lineColor = `rgba(${color}, 0.15)`
  const cornerColor = `rgba(${color}, 0.3)`

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity }}>
      {/* 상단 선 */}
      <div style={{
        position: 'absolute', top: pad, left: pad + 80, right: pad + 80, height: 1,
        background: lineColor,
        transform: `scaleX(${borderProgress})`,
      }} />
      {/* 하단 선 */}
      <div style={{
        position: 'absolute', bottom: pad, left: pad + 80, right: pad + 80, height: 1,
        background: lineColor,
        transform: `scaleX(${borderProgress})`,
      }} />
      {/* 좌측 선 */}
      <div style={{
        position: 'absolute', left: pad, top: pad + 80, bottom: pad + 80, width: 1,
        background: lineColor,
        transform: `scaleY(${borderProgress})`,
      }} />
      {/* 우측 선 */}
      <div style={{
        position: 'absolute', right: pad, top: pad + 80, bottom: pad + 80, width: 1,
        background: lineColor,
        transform: `scaleY(${borderProgress})`,
      }} />

      {/* 코너 장식 — 좌상 */}
      <div style={{ position: 'absolute', top: pad, left: pad }}>
        <div style={{ width: cornerLen, height: 1.5, background: cornerColor }} />
        <div style={{ width: 1.5, height: cornerLen, background: cornerColor }} />
        <div style={{ position: 'absolute', top: -2, left: -2, width: 5, height: 5, borderRadius: '50%', background: cornerColor }} />
      </div>
      {/* 코너 — 우상 */}
      <div style={{ position: 'absolute', top: pad, right: pad }}>
        <div style={{ width: cornerLen, height: 1.5, background: cornerColor, marginLeft: 'auto' }} />
        <div style={{ width: 1.5, height: cornerLen, background: cornerColor, marginLeft: 'auto' }} />
        <div style={{ position: 'absolute', top: -2, right: -2, width: 5, height: 5, borderRadius: '50%', background: cornerColor }} />
      </div>
      {/* 코너 — 좌하 */}
      <div style={{ position: 'absolute', bottom: pad, left: pad }}>
        <div style={{ width: 1.5, height: cornerLen, background: cornerColor, marginTop: 'auto', position: 'absolute', bottom: 0 }} />
        <div style={{ width: cornerLen, height: 1.5, background: cornerColor, position: 'absolute', bottom: 0 }} />
        <div style={{ position: 'absolute', bottom: -2, left: -2, width: 5, height: 5, borderRadius: '50%', background: cornerColor }} />
      </div>
      {/* 코너 — 우하 */}
      <div style={{ position: 'absolute', bottom: pad, right: pad }}>
        <div style={{ width: 1.5, height: cornerLen, background: cornerColor, position: 'absolute', bottom: 0, right: 0 }} />
        <div style={{ width: cornerLen, height: 1.5, background: cornerColor, position: 'absolute', bottom: 0, right: 0 }} />
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 5, height: 5, borderRadius: '50%', background: cornerColor }} />
      </div>
    </div>
  )
}
