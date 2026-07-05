import React from 'react'
import { AbsoluteFill } from 'remotion'
import { FONT, FONT_SERIF, BG, FG, DEFAULT_ACCENT } from '../constants'
import { nameHead, nameTail } from '../utils'

/**
 * 시대 문구 카드 (롱폼 배치) — 세력 블록 사이에 끼워 장(章) 전환을 알린다.
 * 문구는 통합형(앞부분\n뒷부분): 앞부분(예 '4강')은 크게 흰색, 뒷부분(예 '패권을 다투다')은 강조색.
 * 등장·퇴장 페이드는 CueLayer가 크로스페이드로 처리하므로 여기선 정적 레이아웃만.
 */
export const EraCard: React.FC<{ label: string; accent?: string }> = ({ label, accent = DEFAULT_ACCENT }) => {
  const head = nameHead(label)
  const tail = nameTail(label)
  return (
    <AbsoluteFill style={{ background: BG, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 36 }}>
      {/* 윗 구분선 */}
      <div style={{ width: 120, height: 3, background: accent, opacity: 0.85, borderRadius: 2 }} />
      {/* 연대(앞부분) — 크게 흰색 */}
      <div style={{ color: FG, fontFamily: FONT, fontSize: 150, fontWeight: 800, letterSpacing: 4, lineHeight: 1.05, textAlign: 'center', padding: '0 80px' }}>
        {head}
      </div>
      {/* 시대 명칭(뒷부분) — 강조색 세리프 */}
      {tail && (
        <div style={{ color: accent, fontFamily: FONT_SERIF, fontSize: 70, fontWeight: 800, letterSpacing: 2, textAlign: 'center', padding: '0 110px', lineHeight: 1.3 }}>
          {tail}
        </div>
      )}
      {/* 아랫 구분선 */}
      <div style={{ width: 120, height: 3, background: accent, opacity: 0.85, borderRadius: 2 }} />
    </AbsoluteFill>
  )
}
