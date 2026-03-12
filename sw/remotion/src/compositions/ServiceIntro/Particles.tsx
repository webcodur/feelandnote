import { useCurrentFrame } from 'remotion'

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  delay: number
}

/** 떠다니는 금빛 먼지 파티클 */
export const Particles: React.FC<{ count?: number; color?: string }> = ({
  count = 40,
  color = '200, 164, 110',
}) => {
  const frame = useCurrentFrame()

  // 시드 기반 파티클 생성 (매 렌더 동일)
  const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
    x: ((i * 73 + 17) % 100),
    y: ((i * 47 + 31) % 100),
    size: 1.5 + (i % 4) * 0.8,
    speed: 0.15 + (i % 5) * 0.08,
    opacity: 0.15 + (i % 3) * 0.12,
    delay: (i * 13) % 60,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const t = Math.max(0, frame - p.delay)
        const y = (p.y + t * p.speed * -0.3) % 110
        const x = p.x + Math.sin(t * 0.02 + i) * 1.5
        const flicker = Math.sin(t * 0.08 + i * 2) * 0.3 + 0.7

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: `rgba(${color}, ${p.opacity * flicker})`,
              boxShadow: `0 0 ${p.size * 3}px rgba(${color}, ${p.opacity * flicker * 0.5})`,
            }}
          />
        )
      })}
    </div>
  )
}
