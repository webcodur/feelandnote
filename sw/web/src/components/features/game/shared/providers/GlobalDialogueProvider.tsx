"use client";

import { createContext, useContext, useState, useCallback } from "react";
import DialogueSubtitle from "../DialogueSubtitle";
import type { DialogueSubtitleData } from "../hooks/useDialogue";

interface GlobalDialogueContextType {
  subtitle: DialogueSubtitleData | null;
  handleSubtitle: (sub: DialogueSubtitleData | null) => void;
}

const GlobalDialogueContext = createContext<GlobalDialogueContextType | null>(null);

export function GlobalDialogueProvider({ children }: { children: React.ReactNode }) {
  const [subtitle, setSubtitle] = useState<DialogueSubtitleData | null>(null);

  const handleSubtitle = useCallback((sub: DialogueSubtitleData | null) => {
    setSubtitle(sub);
  }, []);

  return (
    <GlobalDialogueContext.Provider value={{ subtitle, handleSubtitle }}>
      {children}
      <DialogueSubtitle subtitle={subtitle} />
    </GlobalDialogueContext.Provider>
  );
}

export function useGlobalDialogue() {
  const context = useContext(GlobalDialogueContext);
  if (!context) {
    throw new Error("useGlobalDialogue must be used within a GlobalDialogueProvider");
  }
  return context;
}
