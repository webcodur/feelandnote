/*
  파일명: /components/features/user/explore/sections/PersonaFullSection/types.ts
  기능: 비범한 기록가 공유 타입
  책임: 포커스 패널에 표시되는 인물 형태 정의.
*/ // ------------------------------

export interface FocusedCeleb {
  id: string;
  slug: string | null;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  profession?: string | null;
  title?: string | null;
  title_en?: string | null;
}
