import React from 'react'
import type { Sub } from '../../../lib/voice-timing'
import { FONT } from '../constants'

/**
 * .srt 로 나갈 별도 자막을 영상 위에 겹쳐 보여준다(확인용). 영상 점등 자막과 별개로,
 * subs.ts(buildFactionSubs)가 만든 조각을 현재 프레임에 맞춰 하단에 띄운다.
 * Studio 토글로만 켜지고 렌더 결과물에는 들어가지 않는다.
 */
export const SrtPreview: React.FC<{ subs: Sub[]; frame: number }> = ({ subs, frame }) => {
  const active = subs.filter(s => frame >= s.start && frame < s.end)
  if (!active.length) return null
  return (
    <div style={{ position: 'absolute', bottom: 56, left: 0, right: 0, zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 48px', pointerEvents: 'none' }}>
      {active.map((s, i) => (
        <div key={i} style={{
          background: 'rgba(0,0,0,0.82)', color: '#fff', fontFamily: FONT, fontSize: 40, fontWeight: 700, lineHeight: 1.35,
          padding: '8px 18px', borderRadius: 6, whiteSpace: 'pre-line', textAlign: 'center', maxWidth: '92%',
          border: '1px solid rgba(255,255,255,0.25)',
        }}>{s.text}</div>
      ))}
    </div>
  )
}
