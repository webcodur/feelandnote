/*
  파일명: /components/features/faction/portrait/useFactionPortraits.ts
  세력도감 화보 한 장씩 넘기기. 인물이 바뀌면 첫 장으로 돌아간다.

  전에는 어록 재생 무대(useFactionQuoteStage)가 화보 자리까지 함께 쥐고 있었다.
  어록을 걷어 내면서 화보만 남겼다 — 사진을 넘기는 일에 재생·음성·자막이 얽혀 있을 이유가 없다.
*/
import { useState } from "react";

export interface FactionPortraits {
  /** 지금 보이는 화보 자리 */
  index: number;
  /** 자리를 옮긴다. 목록 밖 값은 양끝으로 여민다 */
  move: (next: number) => void;
  /** 첫 장으로 돌린다. 다른 인물로 넘어갈 때 쓴다 */
  reset: () => void;
}

export function useFactionPortraits(count: number): FactionPortraits {
  const [index, setIndex] = useState(0);
  const move = (next: number) => setIndex(Math.max(0, Math.min(next, Math.max(0, count - 1))));
  return { index: Math.min(index, Math.max(0, count - 1)), move, reset: () => setIndex(0) };
}
