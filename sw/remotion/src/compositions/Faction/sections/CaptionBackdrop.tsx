import React from 'react'

/**
 * 하단 캡션(세력·그룹 명칭, 인물 신원) 텍스트 단위 글로우 —
 * 시작문구(OpeningLogline)와 같은 타원형 어두운 배경을 "감싼 텍스트 크기만큼만" 깐다.
 * 영역 전체를 물들이지 않고 글줄 하나하나 뒤만 어둡게 해 가독을 보강한다.
 */
export const CaptionBackdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ position: 'relative', display: 'inline-block' }}>
    <span
      style={{
        position: 'absolute',
        left: -28,
        right: -28,
        top: -8,
        bottom: -12,
        background:
          'radial-gradient(ellipse at center, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.68) 42%, rgba(0,0,0,0.34) 68%, rgba(0,0,0,0) 86%)',
        filter: 'blur(10px)',
        pointerEvents: 'none',
      }}
    />
    <span style={{ position: 'relative' }}>{children}</span>
  </span>
)
