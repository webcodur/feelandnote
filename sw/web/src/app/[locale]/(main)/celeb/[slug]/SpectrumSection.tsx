/* ─────────────────────────────────────────────
 * [celeb 상세] spectrum — 구획 진입점 shim(구 import 경로 유지용)
 * - 목차 위치: spectrum(분석 구획, service key `spectrum` / sectionId `analysis`)
 * - 데이터: 아래 default export로 그대로 전달(FigureAnalysisTabs가 이 경로로 가져간다)
 * - 함께 보기: spectrum/SpectrumSectionMain.tsx
 * ───────────────────────────────────────────── */
"use client";

// 950줄 단일 파일을 단일 책임 모듈들로 쪼갠 뒤 남긴 껍데기다. 동작·시각은 그대로 두고
// import 경로(`./SpectrumSection`)가 다른 파일로 번지지 않게 원래 default export만 re-export한다.
// - spectrum/spectrumUtils.ts — jsonb 근거·종합 해설 읽기
// - spectrum/SpectrumPanels.tsx — SectionHeader·MetricPanel·MobileMatchButton
// - spectrum/SpectrumEvidence.tsx — 근거 칩·칩 색·근거 라벨 포맷
// - spectrum/SpectrumMatchGroup.tsx — 분류별 비교 인물 묶음 카드
// - spectrum/SpectrumMatchGroupsModal.tsx — 모바일 비교 묶음 겹창
// - spectrum/SpectrumMetricPanels.tsx — 능력·성향·덕목 패널 조립 훅
// - spectrum/SpectrumHighlights.tsx — 종합 해설과 인물 지문 칩
// - spectrum/SpectrumSectionMain.tsx — 조립(배치·겹창 상태, 실제 default export)
// SpectrumMatchModal.tsx는 이미 분리돼 있어 제자리에 두고 헤더·배너만 다듬었다.

export { default } from "./spectrum/SpectrumSectionMain";
