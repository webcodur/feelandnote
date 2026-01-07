"use client";

import { useEffect } from "react";

interface UseKeyboardShortcutsOptions {
  isBatchMode: boolean;
  isPinMode: boolean;
  toggleBatchMode: () => void;
  exitPinMode: () => void;
}

export function useKeyboardShortcuts({ isBatchMode, isPinMode, toggleBatchMode, exitPinMode }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isBatchMode) toggleBatchMode();
        if (isPinMode) exitPinMode();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isBatchMode, isPinMode, toggleBatchMode, exitPinMode]);
}
