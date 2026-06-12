/*
  파일명: components/features/game/shared/GameLobbyDifficultySelect.tsx
  기능: 난이도 선택 옵션 타입 정의
  책임: 난이도 선택 옵션(DifficultyOption) 타입을 제공한다.
*/
"use client";

import type { ReactNode } from "react";

export interface DifficultyOption {
  value: string;
  label: string;
  englishLabel: string;
  desc: string;
  icon: ReactNode;
  color: "accent" | "red";
}
