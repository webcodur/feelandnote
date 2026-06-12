/**
 * formatCaption — 자막 텍스트의 감싸는 부호를 스타일별로 구분 렌더.
 *
 * sw/web의 FormattedText 규칙을 Remotion(inline style)용으로 포팅.
 *  - 쌍따옴표 "…"            → 골드 (인용·발화)
 *  - 대형 『』 《》           → 《…》로 통일, 밝은색 볼드 (작품명)
 *  - 소형 「」 〈〉 '…'        → '…'로 통일, 골드 + serif (강조·인용)
 *  - 그 외                    → 기본 색 그대로
 */
import React from 'react'
import { FONT } from './fonts'
import { stripCaptionPunct } from './utils'

const ACCENT = '#e0c088'   // 자막용 골드 (배경 위 가독성 위해 살짝 밝게)
const STRONG = '#f4ecd8'   // 작품명 강조색

const SPLIT = /("[^"]*"|(?<!\w)'[^'\n]*'(?!\w)|『[^』]*』|《[^》]*》|「[^」]*」|〈[^〉]*〉)/g

export function formatCaption(text: string): React.ReactNode {
  const t = stripCaptionPunct(text)
  const parts = t.split(SPLIT)
  return parts.map((part, i) => {
    if (!part) return null

    // 쌍따옴표 — 인용·발화
    if (part.length >= 2 && part.startsWith('"') && part.endsWith('"')) {
      return <span key={i} style={{ color: ACCENT }}>{part}</span>
    }

    // 대형: 작품명 → 《…》 통일, 밝은 볼드
    if ((part.startsWith('『') && part.endsWith('』')) || (part.startsWith('《') && part.endsWith('》'))) {
      return <span key={i} style={{ color: STRONG, fontWeight: 700 }}>《{part.slice(1, -1)}》</span>
    }

    // 소형: 강조·인용 → '…' 통일, 골드 + serif
    if (
      (part.startsWith('「') && part.endsWith('」')) ||
      (part.startsWith('〈') && part.endsWith('〉')) ||
      (part.length >= 2 && part.startsWith("'") && part.endsWith("'"))
    ) {
      return <span key={i} style={{ color: ACCENT, fontFamily: FONT.serif }}>‘{part.slice(1, -1)}’</span>
    }

    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}
