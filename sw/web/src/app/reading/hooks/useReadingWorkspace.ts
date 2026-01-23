/*
  파일명: /app/reading/hooks/useReadingWorkspace.ts
  기능: 독서 워크스페이스 상태 관리 훅
  책임: 세션 데이터를 localStorage에 저장/복원한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Section,
  SectionType,
  SelectedBook,
  ReadingWorkspaceData,
  CharacterInfo,
  ReadingQuote,
} from "../types";
import { READING_QUOTES } from "../constants";

const STORAGE_KEY = "reading_workspace";
const ONBOARDING_KEY = "reading_onboarding_shown";

const DEFAULT_SIZE = { width: 280, height: 200 };

interface UseReadingWorkspaceReturn {
  // 상태
  sections: Section[];
  selectedBook: SelectedBook | null;
  elapsedTime: number;
  isRunning: boolean;
  showOnboarding: boolean;
  customQuotes: ReadingQuote[];
  // 세터

  setElapsedTime: (time: number) => void;
  setIsRunning: (running: boolean) => void;
  // 섹션 관리
  addSection: (type: SectionType) => void;
  addSections: (newSections: Partial<Section>[]) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  deleteSection: (id: string) => void;
  toggleSectionVisibility: (id: string) => void;
  reorderSections: (newSections: Section[]) => void;
  // 인물 섹션 전용
  addCharacter: (sectionId: string) => void;
  updateCharacter: (sectionId: string, characterId: string, updates: Partial<CharacterInfo>) => void;
  deleteCharacter: (sectionId: string, characterId: string) => void;
  // 명언 관리
  addQuote: () => void;
  updateQuote: (id: string, updates: Partial<ReadingQuote>) => void;
  deleteQuote: (id: string) => void;
  // 책 관리
  selectBook: (book: SelectedBook | null) => void;
  // 세션 관리
  resetSession: () => void;
  resetTimer: () => void;
  closeOnboarding: () => void;
  openOnboarding: () => void;
  // JSON import/export
  exportToJson: () => string;
  importFromJson: (json: string) => boolean;
}

export function useReadingWorkspace(userId?: string): UseReadingWorkspaceReturn {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedBook, setSelectedBook] = useState<SelectedBook | null>(null);
  const [customQuotes, setCustomQuotes] = useState<ReadingQuote[]>([]);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 세션 복원 + 온보딩 체크
  useEffect(() => {
    const onboardingShown = localStorage.getItem(ONBOARDING_KEY);
    if (!onboardingShown) {
      setShowOnboarding(true);
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // 섹션 데이터 마이그레이션 (이전 형식 호환)
        const migratedSections = (data.sections || []).map((section: Section) => {
          if (section.type === "character") {
            const charData = section.data as { characters?: CharacterInfo[] };
            const migratedCharacters = (charData.characters || []).map((char) => ({
              id: char.id || crypto.randomUUID(),
              names: char.names || (char as { name?: string }).name ? [(char as { name?: string }).name!] : [""],
              gender: char.gender || "unknown",
              description: char.description || "",
              relations: char.relations || [],
            }));
            return { ...section, data: { type: "character" as const, characters: migratedCharacters } };
          }

          // 새 타입들의 기본 데이터 보장
          if (section.type === "timeline" && !section.data) {
            return { ...section, data: { type: "timeline" as const, events: [] } };
          }
          if (section.type === "conceptMap" && !section.data) {
            return { ...section, data: { type: "conceptMap" as const, concepts: [] } };
          }
          if (section.type === "comparison" && !section.data) {
            return { ...section, data: { type: "comparison" as const, items: [], criteriaOrder: [] } };
          }
          if (section.type === "glossary" && !section.data) {
            return { ...section, data: { type: "glossary" as const, terms: [] } };
          }

          return section;
        });
        setSections(migratedSections);
        setSelectedBook(data.selectedBook || null);
        setCustomQuotes(
          data.customQuotes ||
            READING_QUOTES.map((q) => ({ id: crypto.randomUUID(), ...q }))
        );
        setElapsedTime(data.elapsedTime || 0);
      } catch {
        // 파싱 실패 시 무시
      }
    }
    setIsInitialized(true);
  }, []);

  // 자동 저장 (10초마다)
  useEffect(() => {
    if (!isInitialized) return;

    const saveData = () => {
      const data: ReadingWorkspaceData = {
        sections,
        selectedBook,
        customQuotes,
        elapsedTime,
        lastUpdated: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        // 용량 초과 시 이미지 데이터 제외하고 저장 시도
        if (err instanceof DOMException && err.name === "QuotaExceededError") {
          console.warn("localStorage 용량 초과, 이미지 제외 후 저장");
          const sectionsWithoutImages = sections.map((s) =>
            s.type === "image" ? { ...s, data: { type: "image" as const, imageUrl: null } } : s
          );
          const fallbackData = { ...data, sections: sectionsWithoutImages };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fallbackData));
          } catch {
            console.error("localStorage 저장 실패");
          }
        }
      }
    };

    saveData();
    const interval = setInterval(saveData, 10000);
    return () => clearInterval(interval);
  }, [isInitialized, sections, selectedBook, elapsedTime]);

  // #region 섹션 관리
  const addSections = useCallback((newSectionsData: Partial<Section>[]) => {
    const defaultData = {
      basic: { type: "basic" as const, content: "" },
      character: { type: "character" as const, characters: [] },
      image: { type: "image" as const, imageUrl: null },
      timeline: { type: "timeline" as const, events: [] },
      conceptMap: { type: "conceptMap" as const, concepts: [] },
      comparison: { type: "comparison" as const, items: [], criteriaOrder: [] },
      glossary: { type: "glossary" as const, terms: [] },
    };

    setSections((prev) => {
      const added = newSectionsData.map((data, index) => {
        const type = data.type || "basic";
        const offset = (prev.length + index) * 30;
        const titleMap = {
          basic: "메모",
          character: "조직",
          image: "이미지",
          timeline: "타임라인",
          conceptMap: "개념 맵",
          comparison: "비교표",
          glossary: "용어집",
        };

        const sizeMap = {
          basic: { width: 500, height: 300 },
          character: { width: 600, height: 400 },
          image: { width: 500, height: 400 },
          timeline: { width: 600, height: 400 },
          conceptMap: { width: 600, height: 400 },
          comparison: { width: 700, height: 450 },
          glossary: { width: 600, height: 400 },
        };

        return {
          id: crypto.randomUUID(),
          title: data.title || `새 ${titleMap[type]}`,
          type,
          data: data.data || defaultData[type],
          position: data.position || { x: 50 + offset, y: 50 + offset },
          size: data.size || sizeMap[type] || DEFAULT_SIZE,
          isVisible: true,
          createdAt: new Date().toISOString(),
          ...data,
        } as Section;
      });
      return [...prev, ...added];
    });
  }, []);

  const addSection = useCallback((type: SectionType) => {
    addSections([{ type }]);
  }, [addSections]);

  const updateSection = useCallback((id: string, updates: Partial<Section>) => {
    setSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, ...updates } : section))
    );
  }, []);

  const deleteSection = useCallback((id: string) => {
    setSections((prev) => prev.filter((section) => section.id !== id));
  }, []);

  const toggleSectionVisibility = useCallback((id: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, isVisible: !section.isVisible } : section
      )
    );
  }, []);
  const reorderSections = useCallback((newSections: Section[]) => {
    setSections(newSections);
  }, []);
  // #endregion

  // #region 인물 섹션 전용
  const addCharacter = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId || section.type !== "character") return section;
        const data = section.data as { type: "character"; characters: CharacterInfo[] };
        return {
          ...section,
          data: {
            ...data,
            characters: [
              ...data.characters,
              {
                id: crypto.randomUUID(),
                names: [""],
                gender: "unknown" as const,
                description: "",
                relations: [],
              },
            ],
          },
        };
      })
    );
  }, []);

  const updateCharacter = useCallback(
    (sectionId: string, characterId: string, updates: Partial<CharacterInfo>) => {
      setSections((prev) =>
        prev.map((section) => {
          if (section.id !== sectionId || section.type !== "character") return section;
          const data = section.data as { type: "character"; characters: CharacterInfo[] };
          return {
            ...section,
            data: {
              ...data,
              characters: data.characters.map((char) =>
                char.id === characterId ? { ...char, ...updates } : char
              ),
            },
          };
        })
      );
    },
    []
  );

  const deleteCharacter = useCallback((sectionId: string, characterId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId || section.type !== "character") return section;
        const data = section.data as { type: "character"; characters: CharacterInfo[] };
        return {
          ...section,
          data: {
            ...data,
            characters: data.characters.filter((char) => char.id !== characterId),
          },
        };
      })
    );
  }, []);
  // #endregion

  // #region 명언 관리
  const addQuote = useCallback(() => {
    setCustomQuotes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), quote: "", author: "" },
    ]);
  }, []);

  const updateQuote = useCallback((id: string, updates: Partial<ReadingQuote>) => {
    setCustomQuotes((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  }, []);

  const deleteQuote = useCallback((id: string) => {
    setCustomQuotes((prev) => prev.filter((q) => q.id !== id));
  }, []);
  // #endregion

  // #region 책 관리
  const selectBook = useCallback((book: SelectedBook | null) => {
    setSelectedBook(book);
  }, []);
  // #endregion

  // #region 세션 관리
  const resetSession = useCallback(() => {
    if (confirm("모든 데이터를 초기화하시겠습니까? (섹션 포함)")) {
      setSections([]);
      setElapsedTime(0);
      setIsRunning(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (confirm("타이머를 초기화하시겠습니까?")) {
      setElapsedTime(0);
    }
  }, []);

  const closeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, "true");
  }, []);

  const openOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);
  // #endregion

  // #region JSON import/export
  const exportToJson = useCallback(() => {
    const data: ReadingWorkspaceData = {
      sections,
      selectedBook,
      customQuotes,
      elapsedTime,
      lastUpdated: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }, [sections, selectedBook, elapsedTime]);

  const importFromJson = useCallback((json: string): boolean => {
    try {
      const data: ReadingWorkspaceData = JSON.parse(json);
      if (data.sections) setSections(data.sections);
      if (data.selectedBook !== undefined) setSelectedBook(data.selectedBook);
      if (data.customQuotes) setCustomQuotes(data.customQuotes);
      if (data.elapsedTime !== undefined) setElapsedTime(data.elapsedTime);
      return true;
    } catch {
      return false;
    }
  }, []);
  // #endregion

  return {
    sections,
    selectedBook,
    elapsedTime,
    isRunning,
    showOnboarding,
    customQuotes,

    setElapsedTime,
    setIsRunning,
    addSection,
    addSections,
    updateSection,
    deleteSection,
    toggleSectionVisibility,
    reorderSections,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    addQuote,
    updateQuote,
    deleteQuote,
    selectBook,
    resetSession,
    resetTimer,
    closeOnboarding,
    openOnboarding,
    exportToJson,
    importFromJson,
  };
}
