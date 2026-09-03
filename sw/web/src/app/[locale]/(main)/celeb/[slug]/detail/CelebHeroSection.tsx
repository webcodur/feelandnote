/* ─────────────────────────────────────────────
 * [celeb 상세] hero — 구 415줄 히어로의 shim (실체는 hero/로 이동)
 * - 목차 위치: 머리말(본문 앞, 목차 밖)
 * - 데이터: 재수출만 담당. props 정의는 hero/HeroSectionContent가 쥔다
 * - 함께 보기: hero/HeroSectionContent.tsx, hero/HeroIdentity.tsx, hero/HeroPhoto.tsx, hero/useHeroVoice.ts
 * ───────────────────────────────────────────── */
// CelebHeroSection이 415줄 단일 파일이라 AI 가독성이 떨어져 단일 책임 기준으로 분할했다.
// 동작·시각 변경 없이 순수 이동+주석만 적용했으며, 기존 import가 깨지지 않게 이 파일은 shim으로 남긴다.
// 모듈 목록:
// - hero/HeroSectionContent.tsx — 히어로 조립(배너·사진·신원·액션·인용)
// - hero/HeroIdentity.tsx — 정적 신원(headline/meta)
// - hero/HeroPhoto.tsx — 줌·사진 영역
// - hero/useHeroVoice.ts — 음성·인사 인터랙션 훅
"use client";

export { default } from "./hero/HeroSectionContent";
