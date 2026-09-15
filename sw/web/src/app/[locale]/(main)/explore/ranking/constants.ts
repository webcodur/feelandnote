/*
  파일명: /app/(main)/explore/ranking/constants.ts
  기능: 랭킹 화면이 도는 매체 목록
  책임: 매체 키를 한 곳에 고정한다. 'use server' 파일은 함수만 내보낼 수 있어 여기 따로 둔다.
*/ // ------------------------------

export const CONTENT_TYPES = ["BOOK", "VIDEO", "GAME", "MUSIC"] as const;
export type ContentTypeKey = (typeof CONTENT_TYPES)[number];

/** 매체별 대표색 — 카테고리 필·랭킹 카드·공통 서재 지표가 같은 값을 쓴다 */
export const TYPE_COLORS: Record<ContentTypeKey, string> = {
  BOOK: "#3b82f6",
  VIDEO: "#ef4444",
  GAME: "#22c55e",
  MUSIC: "#a855f7",
};

export function resolveRankingType(category: string | string[] | undefined): ContentTypeKey {
  return CONTENT_TYPES.find((type) => type.toLowerCase() === category) ?? "BOOK";
}

export function getRankingHref(type: ContentTypeKey): string {
  return type === "BOOK" ? "/explore/ranking" : `/explore/ranking?category=${type.toLowerCase()}`;
}
