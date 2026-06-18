/** web과 동일한 폰트 스택 */
export const FONT = {
  /** 한글 본문 — Inter + Pretendard */
  sans: 'Inter, "Pretendard Variable", Pretendard, "Noto Sans KR", sans-serif',
  /** 프리텐다드 단일 — 솔로 자막 등 한글 우선 표기 */
  pretendard: '"Pretendard Variable", Pretendard, "Noto Sans KR", sans-serif',
  /** 한글 세리프 — 감상철학, 셀럽 응답 */
  serif: 'MaruBuri, "Noto Serif KR", serif',
  /** 영문 장식 — 라벨, 섹션 타이틀 */
  cinzel: 'Cinzel, serif',
  /** 영문 서브 — nickname_en 등 */
  cormorant: '"Cormorant Garamond", serif',
  /** 브랜드 */
  brand: '"Castoro Titling", Cinzel, serif',
  /** 수식어 — 롱폼 썸네일 직함 */
  hahmlet: 'Hahmlet, "Noto Serif KR", serif',
  /** 쇼츠 헤드라인 — 인물명 임팩트 */
  doHyeon: '"Do Hyeon", "Pretendard Variable", sans-serif',
} as const
