/*
  파일명: /components/features/faction/atlas/FactionGroupContext.tsx
  기능: 세력도감 테마 화면의 진영 선택 상태
  책임: 칩 상자의 진영 줄, 설명 영역의 진영 설명 판, 인물 격자가 같은 선택을 본다.
        「전체」는 없고 첫 진영(initialKey)부터 시작한다. 테마가 바뀌면 부르는 쪽이 key로 새로 연다.
*/ // ------------------------------

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/** 진영 줄·설명 판이 쓰는 진영 요약 — 인물 카드 조회 없이 명단만으로 만든다 */
export interface FactionGroupMeta {
  key: string;
  /** 진영 이름 — 진영이 없는 인물 묶음이면 null */
  label: string | null;
  description: string | null;
  count: number;
}

interface FactionGroupState {
  /** 고른 진영 key — null이면 진영 구분 없이 테마 전원 */
  groupKey: string | null;
  setGroupKey: (key: string | null) => void;
}

const FactionGroupContext = createContext<FactionGroupState>({ groupKey: null, setGroupKey: () => {} });

export function FactionGroupProvider({ initialKey = null, children }: { initialKey?: string | null; children: ReactNode }) {
  const [groupKey, setGroupKey] = useState<string | null>(initialKey);
  return <FactionGroupContext.Provider value={{ groupKey, setGroupKey }}>{children}</FactionGroupContext.Provider>;
}

export function useFactionGroup() {
  return useContext(FactionGroupContext);
}
