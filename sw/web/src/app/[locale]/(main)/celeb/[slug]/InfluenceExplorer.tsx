/* ─────────────────────────────────────────────
 * [celeb 상세] influence — 구 import 경로 유지용 shim (실체는 influence/에 있음)
 * - 목차 위치: influence(분석 구획, i18n 키 profilePage.influence)
 * - 데이터: data(InfluenceExplorerData)를 그대로 InfluenceExplorerView에 전달
 * - 함께 보기: influence/InfluenceExplorerView.tsx, influence/RankingSection.tsx, influence/LeadersSection.tsx, influence/PersonCardMetrics.tsx, influence/RankActionButton.tsx, influence/influence-helpers.ts
 * ───────────────────────────────────────────── */

// 423줄 단일 파일을 AI 가독성 위주로 나눈 import 호환 shim이다. 동작·시각 변경 없이
// 순수 이동+주석만 적용했으며, CelebInfluenceSection.tsx의 import가 번지지 않게
// 원래 default export를 그대로 re-export한다.
//
// 모듈 목록:
// - influence/influence-helpers.ts — 컴팩트 개수 상수·선택 타입·순위 계산 순수 함수
// - influence/RankActionButton.tsx — 순위 숫자 단추
// - influence/PersonCardMetrics.tsx — 카드 안 상위 지표 2개 + 총점
// - influence/RankingSection.tsx — 이웃 순위 가로 목록 구획
// - influence/LeadersSection.tsx — 분야별 1위 탭·패널 구획
// - influence/InfluenceExplorerView.tsx — 상태·조립·모달을 쥐는 루트 뷰 (실체)

export { default } from "./influence/InfluenceExplorerView";
