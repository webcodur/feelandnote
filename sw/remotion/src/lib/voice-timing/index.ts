/**
 * 음성 타이밍 공통 모듈 — 시리즈 무관 단일원천(SSoT).
 *
 * 자막 페이지 분할·타이밍 슬라이스·하이라이트 세그먼트 빌드 등 순수 로직과
 * 타입(VoiceTimingSegment 등)을 모은다. BookRecommend·Faction 등 모든 시리즈가
 * 여기서 import 한다. UI 컴포넌트는 src/components/caption/ 에 둔다.
 */
export * from './types'
export * from './sentence-split'
