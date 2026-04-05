/**
 * PortraitSubtitles — 세로(portrait) 롱폼 하단 자막
 *
 * buildLongSubs로 생성한 Sub 배열에서 현재 프레임에 해당하는 자막을 찾아
 * ShortCaption Glass Tablet 스타일로 표시한다.
 */
import React from 'react'
import { useCurrentFrame } from 'remotion'
import type { BookRecommendScript } from '../types'
import type { Timeline } from '../useTimeline'
import { buildLongSubs } from '../studio/StudioSubtitles'
import { FONT } from '../fonts'
import type { Sub } from '../utils'

interface Props {
  script: BookRecommendScript
  tl: Timeline
}

export const PortraitSubtitles: React.FC<Props> = ({ script, tl }) => {
  const frame = useCurrentFrame()
  const subs = buildLongSubs(script, tl)
  const current = subs.find(s => frame >= s.start && frame < s.end)
  if (!current) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 380, // P_BOTTOM_H(360) + 여백 20
      left: 40, right: 40,
      display: 'flex', justifyContent: 'center',
      zIndex: 80,
    }}>
      <div style={{
        // ShortCaption Glass Tablet 스타일
        fontSize: 44,
        fontWeight: 600,
        fontFamily: FONT.sans,
        lineHeight: 1.35,
        whiteSpace: 'pre-wrap',
        textAlign: 'center',
        wordBreak: 'keep-all',
        color: '#e8e0d0',
        background: 'rgba(10, 9, 7, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(200, 164, 110, 0.1)',
        borderBottom: 'none',
        borderRadius: 14,
        padding: '10px 22px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
        textShadow: '0 1px 4px rgba(0,0,0,0.4)',
        maxWidth: 960,
      }}>
        {current.text}
      </div>
    </div>
  )
}
