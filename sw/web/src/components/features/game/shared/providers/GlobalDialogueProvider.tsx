"use client";

import { createContext, useContext, useState, useCallback } from "react";
import DialogueSubtitle from "../DialogueSubtitle";
import type { DialogueSubtitleData } from "../hooks/useDialogue";
import { useVoiceMuted } from "@/hooks/useVoiceMuted";
import { useDialoguePosition } from "@/hooks/useDialoguePosition";

interface GlobalDialogueContextType {
  subtitle: DialogueSubtitleData | null;
  handleSubtitle: (sub: DialogueSubtitleData | null) => void;
  voiceMuted: boolean;
  toggleVoiceMuted: () => void;
}

const GlobalDialogueContext = createContext<GlobalDialogueContextType | null>(null);

export function GlobalDialogueProvider({ children }: { children: React.ReactNode }) {
  const [subtitle, setSubtitle] = useState<DialogueSubtitleData | null>(null);
  const { voiceMuted, toggleVoiceMuted } = useVoiceMuted();
  const { coords, saveCoords } = useDialoguePosition();

  const handleSubtitle = useCallback((sub: DialogueSubtitleData | null) => {
    console.log("[Dialogue] handleSubtitle:", sub?.text?.slice(0, 30));
    setSubtitle(sub);
  }, []);

  return (
    <GlobalDialogueContext.Provider value={{ subtitle, handleSubtitle, voiceMuted, toggleVoiceMuted }}>
      {children}
      <DialogueSubtitle
        subtitle={subtitle}
        voiceMuted={voiceMuted}
        onToggleMute={toggleVoiceMuted}
        coords={coords}
        onSaveCoords={saveCoords}
      />
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
