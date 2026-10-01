/*
  파일명: components/features/game/myth/shared/stage.ts
  기능: 신화 게임 무대 정보
  책임: 틀(MythGameFrame)이 깐 배경 그림을 시작·결과 화면이 따로 받지 않고도 표지로 쓰게 한다.
*/ // ------------------------------
"use client";

import { createContext, useContext } from "react";

export const MythStageContext = createContext<string | null>(null);

export function useStageArt(): string | null {
  return useContext(MythStageContext);
}

// 틀 안의 스크롤 칸을 맨 위로 올린다. 장면이 바뀌어 새 글을 처음부터 읽어야 할 때 쓴다
export function scrollStageTop() {
  document.querySelector("[data-myth-scroll]")?.scrollTo({ top: 0 });
}

// 틀 안의 스크롤 칸을 맨 아래로 내린다. 화면 아래에 붙는 막대가 판 끝을 가리지 않게 할 때 쓴다
export function scrollStageEnd(smooth: boolean) {
  const stage = document.querySelector("[data-myth-scroll]");
  stage?.scrollTo({ top: stage.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}
