// z-index 레이어 관리
// 숫자가 클수록 상위 레이어

export const Z_INDEX = {
  // 배경 요소 (음수)
  background: -10,

  // 기본 레이어
  base: 0,

  // 내부 요소 (sticky 헤더, 타임라인 등)
  sticky: 10,

  // 카드 내부 요소
  cardBadge: 20,
  cardMenu: 30,

  // FAB (Floating Action Button)
  fab: 50,

  // 플로팅 뮤직 플레이어
  floatingPlayer: 150,

  // 네비게이션
  sidebar: 100,
  bottomNav: 100,
  header: 100,

  // 드롭다운, 팝오버
  dropdown: 200,
  popover: 200,
  tooltip: 250,

  // 오버레이, 모달
  overlay: 500,
  modal: 600,

  // 토스트, 알림
  toast: 700,
  notification: 700,

  // 최상위 (긴급 알림, 로딩 등)
  top: 9999,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
