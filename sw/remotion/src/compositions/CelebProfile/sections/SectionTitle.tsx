/**
 * 섹션 제목 — 좌측 정렬, 확장 언더라인, 서브타이틀 스태거
 */
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT } from '../../BookRecommend/fonts'
import { f } from '../timing'

type Props = {
  title: string
  subtitle?: string
  startFrame: number
  durationFrames: number
  align?: 'left' | 'center'
}

export const SectionTitle: React.FC<Props> = ({ title, subtitle, startFrame, durationFrames, align = 'left' }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame

  if (local < -10 || local > durationFrames + 10) return null

  const titleOp = interpolate(local, [0, f(0.5), durationFrames - f(0.5), durationFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const titleY = interpolate(local, [0, f(0.5)], [15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const lineW = interpolate(local, [f(0.2), f(0.8)], [0, 120], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const subOp = interpolate(local, [f(0.4), f(0.8), durationFrames - f(0.5), durationFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const subY = interpolate(local, [f(0.4), f(0.8)], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: align === 'center' ? 'center' : 'flex-start',
      gap: 8,
    }}>
      <div style={{
        fontSize: 18, color: '#c8a46e', fontFamily: FONT.cinzel,
        letterSpacing: 4, fontWeight: 600,
        opacity: titleOp, transform: `translateY(${titleY}px)`,
      }}>
        {title}
      </div>
      <div style={{ width: lineW, height: 1, backgroundColor: '#c8a46e', opacity: 0.5 }} />
      {subtitle && (
        <div style={{
          fontSize: 13, color: '#666', fontFamily: FONT.sans,
          letterSpacing: 2,
          opacity: subOp, transform: `translateY(${subY}px)`,
        }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
