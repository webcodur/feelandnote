/**
 * 셀럽 음성 파일 URL 생성 유틸리티 (클라이언트 전용)
 *
 * R2 키: celebs/{id}/voice/{locale}/{prefix}{variant}.mp3 (고정 경로)
 * URL:   {base}?v={voiceV}                                (캐시 버스터)
 *
 * 경로 규칙 SSoT: web-bo는 sw/web-bo/src/lib/voice-path.ts
 */

const R2_PUBLIC_URL = "https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev";

/** DialogueType → 파일 접두사 매핑 */
const TYPE_PREFIX: Record<string, string> = {
  greeting: "g",
  roll_call: "r",
  deploy: "d",
  battle_win: "bw",
  battle_draw: "bd",
  battle_lose: "bl",
  clash_attack: "c",
};

/** 대사 음성 URL (variant: 1|2|3) */
export function getVoiceUrl(
  celebId: string,
  locale: "ko" | "en",
  type: string,
  variant: number,
  voiceV = 0
): string {
  const prefix = TYPE_PREFIX[type] ?? type;
  const base = `${R2_PUBLIC_URL}/celebs/${celebId}/voice/${locale}/${prefix}${variant}.mp3`;
  return voiceV > 0 ? `${base}?v=${voiceV}` : base;
}

/** 명언 음성 URL */
export function getQuoteVoiceUrl(
  celebId: string,
  locale: "ko" | "en",
  voiceV = 0
): string {
  const base = `${R2_PUBLIC_URL}/celebs/${celebId}/voice/${locale}/quote.mp3`;
  return voiceV > 0 ? `${base}?v=${voiceV}` : base;
}
