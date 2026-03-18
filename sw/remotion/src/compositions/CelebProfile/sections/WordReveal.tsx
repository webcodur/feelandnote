/**
 * 단어별 순차 등장 — 전환 텍스트용
 */
import { interpolate, useCurrentFrame } from 'remotion'
import { FONT } from '../../BookRecommend/fonts'
import { f } from '../timing'

type Props = {
  text: string
  startFrame: number
  durationFrames: number
  fontSize?: number
  color?: string
  lineHeight?: number
}

export const WordReveal: React.FC<Props> = ({
  text, startFrame, durationFrames,
  fontSize = 32, color = '#e8e0d0', lineHeight = 1.8,
}) => {
  const frame = useCurrentFrame()
  const local = frame - startFrame

  if (local < -10 || local > durationFrames + 10) return null

  const words = text.split(/\s+/)
  const spreadFrames = Math.min(durationFrames * 0.6, words.length * 12)
  const delayPerWord = spreadFrames / words.length

  // 전체 페이드아웃
  const fadeOut = interpolate(local, [durationFrames - f(0.5), durationFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <div style={{
      fontSize, color, fontFamily: FONT.serif, lineHeight, textAlign: 'center',
      maxWidth: 1100, padding: '0 80px', opacity: fadeOut,
    }}>
      {words.map((word, i) => {
        const wordLocal = local - i * delayPerWord
        const op = interpolate(wordLocal, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        const y = interpolate(wordLocal, [0, 10], [8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        return (
          <span key={i} style={{
            display: 'inline-block', opacity: op,
            transform: `translateY(${y}px)`,
            marginRight: 8,
          }}>
            {word}
          </span>
        )
      })}
    </div>
  )
}
