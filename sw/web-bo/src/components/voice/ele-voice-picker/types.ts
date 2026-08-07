/**
 * 보이스 고르기 위젯이 쓰는 공통 타입.
 *
 * 추천 순위를 매기는 규칙은 화면마다 다르다(세력도감은 인물의 역할·소속, 인물 상세는 직군·성별).
 * 위젯은 결과 모양만 알면 되므로 그 모양을 여기 둔다.
 */
export type EleVoiceRecommendation = {
  voiceId: string
  score: number
  /** 왜 추천했는지 — 목록에 그대로 뜬다 */
  reasons: string[]
}
