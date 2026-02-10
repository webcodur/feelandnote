"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { ContentType } from "@/types/database";

export interface QuickRecordTarget {
  id: string; // user_contents.id
  contentId?: string; // original content.id (for fetching details)
  type: ContentType;
  title: string;
  thumbnailUrl?: string | null;
  creator?: string | null;
  initialRating?: number;
  initialReview?: string | null;
  initialPresets?: string[] | null;
  isRecommendation?: boolean; // 추천 아이템 여부 (안내 문구 표시용)
}

interface QuickRecordContextType {
  targetContent: QuickRecordTarget | null;
  isOpen: boolean;
  openQuickRecord: (content: QuickRecordTarget) => void;
  closeQuickRecord: () => void;
}

const QuickRecordContext = createContext<QuickRecordContextType | undefined>(undefined);

export function QuickRecordProvider({ children }: { children: ReactNode }) {
  const [targetContent, setTargetContent] = useState<QuickRecordTarget | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openQuickRecord = (content: QuickRecordTarget) => {
    setTargetContent(content);
    setIsOpen(true);
  };

  const closeQuickRecord = () => {
    setIsOpen(false);
    // 애니메이션 후 초기화 등을 위해 delay를 줄 수 있지만 일단 단순하게
    setTimeout(() => setTargetContent(null), 300);
  };

  return (
    <QuickRecordContext.Provider value={{ targetContent, isOpen, openQuickRecord, closeQuickRecord }}>
      {children}
    </QuickRecordContext.Provider>
  );
}

export function useQuickRecord() {
  const context = useContext(QuickRecordContext);
  if (!context) {
    throw new Error("useQuickRecord must be used within a QuickRecordProvider");
  }
  return context;
}
