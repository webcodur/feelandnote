"use client";

import { createContext, useContext } from "react";

// 카드 아래 구매 액션도 사용자가 고른 판본의 제목·표지·언어를 따른다.
export const ContentCardDisplayContext = createContext<{
  contentId?: string;
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  bookLocale?: "ko" | "en";
  available: boolean;
} | null>(null);

export const useContentCardDisplay = () => useContext(ContentCardDisplayContext);
