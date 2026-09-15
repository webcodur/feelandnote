/*
  파일명: /components/features/faction/atlas/FactionThemeMusic.tsx
  기능: 지금 테마의 곡을 전역 음악 재생기에 올린다
  책임: 테마를 열면 그 테마곡을 재생기 목록 맨 위 「추천」으로 등록하고, 테마를 벗어나면 내린다. 화면에는 아무것도 그리지 않는다.
*/ // ------------------------------

"use client";

import { useRegisterFactionMusic } from "@/contexts/FactionMusicContext";

interface FactionThemeMusicProps {
  id: string;
  title: string;
  /** 테마곡 주소 — 곡이 없는 테마면 null */
  url: string | null;
}

export default function FactionThemeMusic({ id, title, url }: FactionThemeMusicProps) {
  useRegisterFactionMusic(url ? { id, title, url } : null);
  return null;
}
