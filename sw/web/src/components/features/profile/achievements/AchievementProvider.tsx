/*
  파일명: /components/features/achievements/AchievementProvider.tsx
  기능: 칭호 해금 알림 전역 상태 관리
  책임: 칭호 해금 시 모달을 표시하고 Context로 상태를 제공한다.
*/ // ------------------------------
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import AchievementUnlockModal from "./AchievementUnlockModal";

interface UnlockedTitle {
  id: string;
  name: string;
  description: string;
  grade: "common" | "uncommon" | "rare" | "epic" | "legendary";
  bonus_score: number;
}

interface AchievementContextType {
  showUnlock: (titles: UnlockedTitle[]) => void;
}

const AchievementContext = createContext<AchievementContextType | null>(null);

// Context가 없는 환경에서도 안전하게 동작하는 no-op 반환
const noopContext: AchievementContextType = {
  showUnlock: () => {},
};

export function useAchievement() {
  const context = useContext(AchievementContext);
  return context ?? noopContext;
}

interface AchievementProviderProps {
  children: ReactNode;
}

export default function AchievementProvider({ children }: AchievementProviderProps) {
  const [unlockedTitles, setUnlockedTitles] = useState<UnlockedTitle[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const showUnlock = useCallback((titles: UnlockedTitle[]) => {
    if (titles.length > 0) {
      setUnlockedTitles(titles);
      setIsOpen(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setUnlockedTitles([]);
  }, []);

  return (
    <AchievementContext.Provider value={{ showUnlock }}>
      {children}
      {isOpen && unlockedTitles.length > 0 && (
        <AchievementUnlockModal titles={unlockedTitles} onClose={handleClose} />
      )}
    </AchievementContext.Provider>
  );
}
