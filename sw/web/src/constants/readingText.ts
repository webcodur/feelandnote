/*
  카드 본문에 통째로 싣는 길이 상한 — 이 이상은 카드가 아니라 별개 읽기물(인터뷰 전사 등)로
  보고 접어 모달로 보낸다. 같은 내용도 영어가 한국어보다 1.6~1.7배 길어 로케일별로 둔다.
  실측 기준: 한국어 감상배경 99%가 661자 안팎, 게이츠노트 최장 6,586자(en 11,654)까지 인라인이고
  그 위는 오프라 인터뷰 전사(ko 9,758~/en 15,833~)만 남는다.
*/
export const INLINE_READING_TEXT_MAX: Record<string, number> = {
  ko: 8_000,
  en: 14_000,
};

/** 표시 로케일의 본문이 카드 안에 통째로 들어가도 되는 길이인지 잰다. */
export function fitsInlineReadingText(
  text: string | null | undefined,
  locale: string,
): boolean {
  if (!text) return true;
  const limit = INLINE_READING_TEXT_MAX[locale] ?? INLINE_READING_TEXT_MAX.ko;
  return text.length <= limit;
}
