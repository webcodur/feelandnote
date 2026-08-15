/*
  파일명: /app/(main)/explore/ranking/constants.ts
  기능: 랭킹 화면이 도는 매체 목록
  책임: 매체 키를 한 곳에 고정한다. 'use server' 파일은 함수만 내보낼 수 있어 여기 따로 둔다.
*/ // ------------------------------

export const CONTENT_TYPES = ["BOOK", "VIDEO", "GAME", "MUSIC"] as const;
export type ContentTypeKey = (typeof CONTENT_TYPES)[number];
