/*
  파일명: /components/ui/cards/ContentCard/reviewContent.ts
  기능: 카드에 실을 감상 내용이 실제로 있는지 가린다.
  책임: review는 string | null이다 — 「감상을 아직 안 쓴 기록」이 null로 들어온다.
        undefined만 걸러 내면 그 기록까지 출처 누락으로 몰려 콘솔이 경고로 덮인다.
*/ // ------------------------------

/** 감상 글이나 감상 프리셋이 실제로 담겨 있으면 참. 빈 문자열은 없는 것으로 본다. */
export function hasReviewContent(
  review: string | null | undefined,
  reviewPresets: string[] | null | undefined,
): boolean {
  if (typeof review === "string" && review.trim() !== "") return true;
  return reviewPresets != null && reviewPresets.length > 0;
}
