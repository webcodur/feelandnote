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

export function useAchievement() {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error("useAchievement must be used within AchievementProvider");
  }
  return context;
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
