import React from 'react'
import { HEADER_H, BG, FG, FONT_SERIF } from '../constants'
import { nameHead, nameTail } from '../utils'

/**
 * 쇼츠 상단 고정 빈 영역(블랙 프레임) + 영상 명칭.
 * 본문 컷(세력·화보·인물)은 이 영역 아래에만 그려지고, 여기는 항상 검정 여백으로 비어 영상 명칭만 박힌다.
 * 영상 명칭은 통합 한 필드(앞부분\n뒷부분) — 앞부분은 흰색, 뒷부분은 세력색으로 콜론 뒤에 붙인다.
 * 인트로·아웃트로 구간에서는 숨고, 본문 진입 시 크로스페이드와 동기로 페이드인한다.
 */
export const TopHeader: React.FC<{ caption: string; opacity: number; accent: string }> = ({ caption, opacity, accent }) => {
  const head = nameHead(caption)
  const tail = nameTail(caption)
  return (
  <div style={{
    position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
    background: BG, zIndex: 50, opacity,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 0 34px', gap: 16,
  }}>
    {/* [앞부분 뒷부분]과 언더라인을 같은 래퍼에 — 래퍼 너비를 텍스트에 맞추고(fit-content) 언더라인은 100%로 그 너비를 따라간다 */}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 20, width: 'fit-content', maxWidth: '100%' }}>
      {/* 앞부분: 뒷부분 — serif로 통일(본문과 한 톤), 콜론 뒤 간격. 강조색은 현재 보이는 세력색(동적). */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ color: `${FG}ee`, fontFamily: FONT_SERIF, fontSize: 80, fontWeight: 700, letterSpacing: 1.5, textAlign: 'center', lineHeight: 1.1 }}>
          {tail ? `${head}:` : head}
        </div>
        {tail && (
          <div style={{ color: accent, fontFamily: FONT_SERIF, fontSize: 80, fontWeight: 700, letterSpacing: 2, textAlign: 'center', lineHeight: 1.1 }}>
            {tail}
          </div>
        )}
      </div>
      {/* 가는 언더라인 — 텍스트 너비에 맞춤(100%), 현재 세력색, 양끝 페이드 */}
      <div style={{ width: '100%', height: 3, borderRadius: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
    </div>
  </div>
  )
}
