/*
  파일명: /components/features/scriptures/Scriptures/types.ts
  기능: Scriptures 컴포넌트 공유 타입 및 상수
*/ // ------------------------------

import type { LucideIcon } from "lucide-react";
import { Scroll, Route, User, Clock } from "lucide-react";

// #region Types
export interface ProfessionCount {
  profession: string;
  label: string;
  count: number;
}

export interface ScripturesProps {
  initialChosen: import("@/actions/scriptures").ScripturesResult;
  initialProfessionCounts: ProfessionCount[];
}

export type CategoryFilter = "ALL" | "BOOK" | "VIDEO" | "GAME" | "MUSIC";
// #endregion

// #region Constants
export const SECTION_IDS = [
  { id: "sage-section", key: "sage", icon: User },
  { id: "chosen-section", key: "chosen", icon: Scroll, hasBg: true },
  { id: "profession-section", key: "profession", icon: Route },
  { id: "era-section", key: "era", icon: Clock, hasBg: true },
] as const;

export const ITEMS_PER_PAGE = 12;
// #endregion
