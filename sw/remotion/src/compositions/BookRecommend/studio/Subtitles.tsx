/**
 * Subtitles — DEV 전용 자막 오버레이
 * BookRecommend.tsx에서 자막 데이터를 받아 현재 프레임에 맞는 자막만 표시.
 */
import { useCurrentFrame } from 'remotion'
import { FONT } from '../fonts'

export type Sub = { start: number; end: number; speaker: string; text: string }

type Props = { subs: Sub[] }

export const Subtitles: React.FC<Props> = ({ subs }) => {
  const frame = useCurrentFrame()
  const current = subs.find((s) => frame >= s.start && frame < s.end)
  if (!current) return null

  const isSummary = current.speaker === '요약'
  const isCeleb = !isSummary && current.speaker !== '나레이터'

  return (
    <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 8, padding: '10px 24px', maxWidth: 900, textAlign: 'center' }}>
        <div style={{ color: isCeleb ? '#c8a46e' : isSummary ? '#8bb8a8' : '#888', fontSize: 12, fontFamily: FONT.sans, marginBottom: 3, letterSpacing: 1 }}>
          {current.speaker}
        </div>
        <div style={{ color: '#e8e0d0', fontSize: 20, fontFamily: FONT.sans, lineHeight: 1.5 }}>
          {current.text}
        </div>
      </div>
    </div>
  )
}
