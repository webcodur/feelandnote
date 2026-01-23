/*
  파일명: /app/reading/[contentId]/types.ts
  기능: 리딩 세션 타입 정의
*/ // ------------------------------

export type NoteColor = "yellow" | "green" | "blue" | "purple" | "pink";

export interface StickyNote {
  id: string;
  content: string;
  page?: number;
  color: NoteColor;
  position: {
    x: number;
    y: number;
  };
  createdAt: string;
}

export interface ReadingSessionData {
  id: string;
  userContentId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  duration: number; // 초 단위
  startPage?: number;
  endPage?: number;
  notes: StickyNote[];
}
