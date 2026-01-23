/*
  파일명: /app/reading/[contentId]/hooks/useReadingSession.ts
  기능: 리딩 세션 상태 관리 훅
  책임: 세션 데이터를 localStorage에 저장/복원한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useCallback } from "react";
import type { StickyNote, ReadingSessionData } from "../types";

const STORAGE_KEY_PREFIX = "reading_session_";

interface UseReadingSessionReturn {
  notes: StickyNote[];
  currentPage: number;
  elapsedTime: number;
  isRunning: boolean;
  setNotes: React.Dispatch<React.SetStateAction<StickyNote[]>>;
  setCurrentPage: (page: number) => void;
  setElapsedTime: (time: number) => void;
  setIsRunning: (running: boolean) => void;
  addNote: (note: StickyNote) => void;
  updateNote: (id: string, updates: Partial<StickyNote>) => void;
  deleteNote: (id: string) => void;
  saveSession: () => void;
  clearSession: () => void;
}

export function useReadingSession(userContentId: string): UseReadingSessionReturn {
  const storageKey = `${STORAGE_KEY_PREFIX}${userContentId}`;

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // 세션 복원
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const data: ReadingSessionData = JSON.parse(saved);
        setNotes(data.notes || []);
        setCurrentPage(data.endPage || 0);
        setElapsedTime(data.duration || 0);
      } catch {
        // 파싱 실패 시 무시
      }
    }
    setIsInitialized(true);
  }, [storageKey]);

  // 자동 저장 (30초마다 + 변경 시)
  useEffect(() => {
    if (!isInitialized) return;

    const saveData = () => {
      const data: ReadingSessionData = {
        id: crypto.randomUUID(),
        userContentId,
        userId: "", // 서버에서 설정
        startedAt: new Date().toISOString(),
        duration: elapsedTime,
        endPage: currentPage,
        notes,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    };

    const interval = setInterval(saveData, 30000);
    saveData(); // 즉시 저장

    return () => clearInterval(interval);
  }, [isInitialized, storageKey, userContentId, notes, currentPage, elapsedTime]);

  const addNote = useCallback((note: StickyNote) => {
    setNotes((prev) => [...prev, note]);
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<StickyNote>) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...updates } : note))
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  const saveSession = useCallback(() => {
    const data: ReadingSessionData = {
      id: crypto.randomUUID(),
      userContentId,
      userId: "",
      startedAt: new Date().toISOString(),
      duration: elapsedTime,
      endPage: currentPage,
      notes,
    };
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [storageKey, userContentId, elapsedTime, currentPage, notes]);

  const clearSession = useCallback(() => {
    localStorage.removeItem(storageKey);
    setNotes([]);
    setCurrentPage(0);
    setElapsedTime(0);
  }, [storageKey]);

  return {
    notes,
    currentPage,
    elapsedTime,
    isRunning,
    setNotes,
    setCurrentPage,
    setElapsedTime,
    setIsRunning,
    addNote,
    updateNote,
    deleteNote,
    saveSession,
    clearSession,
  };
}
