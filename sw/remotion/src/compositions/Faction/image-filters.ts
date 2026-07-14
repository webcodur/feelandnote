/**
 * 팩션 이미지 필터 효과 — CSS filter 스타일 문자열 생성
 * 
 * 효과 옵션:
 * - vintage: 옛날 필름 느낌 (세피아 + 명도·채도 조정)
 * - sepia: 세피아 톤
 * - grayscale: 흑백
 * - duotone: 두 가지 톤 (따뜻한 톤)
 * - fade: 페이드 효과 (밝고 부드럽게)
 */

export type ImageFilter = 'vintage' | 'sepia' | 'grayscale' | 'duotone' | 'fade'

export function getFilterCSS(filter?: ImageFilter): string {
  switch (filter) {
    case 'vintage':
      // 옛날 필름: 세피아 30% + 명도 약간 상향 + 채도 약간 하향
      return 'sepia(0.3) saturate(0.8) brightness(1.05) contrast(1.08)'
    case 'sepia':
      // 세피아 톤: 중간 강도
      return 'sepia(0.6) saturate(1.1) brightness(1.02)'
    case 'grayscale':
      // 흑백
      return 'grayscale(1)'
    case 'duotone':
      // 따뜻한 투톤 (세피아 + 색상환)
      return 'sepia(0.45) hue-rotate(-5deg) saturate(1.2)'
    case 'fade':
      // 페이드 (밝고 부드러운 과노출 느낌)
      return 'brightness(1.15) contrast(0.9) saturate(0.95)'
    default:
      return ''
  }
}

export const FILTER_LABELS: Record<ImageFilter | '', string> = {
  '': '원본',
  'vintage': '옛날 필름',
  'sepia': '세피아',
  'grayscale': '흑백',
  'duotone': '투톤',
  'fade': '페이드',
}
