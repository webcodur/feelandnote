/**
 * 셀럽 음성 파일 URL 생성 유틸리티
 * R2 Storage: celebs/{id}/voice/{locale}/{type}{variant}.mp3
 */

const R2_PUBLIC_URL = "https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev";

/** DialogueType → 파일 접두사 매핑 */
const TYPE_PREFIX: Record<string, string> = {
  greeting: "g",
  roll_call: "a",
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
  variant: number
): string {
  const prefix = TYPE_PREFIX[type] ?? type;
  return `${R2_PUBLIC_URL}/celebs/${celebId}/voice/${locale}/${prefix}${variant}.mp3`;
}

/** 명언 음성 URL */
export function getQuoteVoiceUrl(
  celebId: string,
  locale: "ko" | "en"
): string {
  return `${R2_PUBLIC_URL}/celebs/${celebId}/voice/${locale}/quote.mp3`;
}
