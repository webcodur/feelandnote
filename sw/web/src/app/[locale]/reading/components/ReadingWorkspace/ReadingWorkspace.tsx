/*
  파일명: /app/reading/components/ReadingWorkspace/ReadingWorkspace.tsx
  기능: 독서 모드 워크스페이스
  책임: 좌측 사이드바 + 캔버스 섹션 + 우측 지원 섹션을 통합한다.
*/ // ------------------------------

"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Monitor } from "lucide-react";
import LeftSidebar from "../LeftSidebar";
import SectionWindow from "../SectionWindow";
import BookSearchModal from "../BookSearchModal";
import BookInfoWindow from "../BookInfoWindow";
import OnboardingModal from "../OnboardingModal";
import WorkspaceHeader from "./WorkspaceHeader";
import SupportSidebar from "./SupportSidebar";
import { useSidebarResize } from "./useSidebarResize";
import { useReadingWorkspace } from "../../hooks/useReadingWorkspace";
import type { SelectedBook } from "../../types";

interface Props {
  userId?: string;
  initialBook?: SelectedBook; // 고정된 책 (URL에서 전달)
  isBookLocked?: boolean; // 책 변경 불가 여부
}

export default function ReadingWorkspace({ userId, initialBook, isBookLocked = false }: Props) {
  const t = useTranslations("reading.workspace");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookInfoOpen, setIsBookInfoOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // 사이드바 리사이즈 & 토글
  const {
    leftWidth,
    rightWidth,
    isLeftSidebarOpen,
    setIsLeftSidebarOpen,
    isRightSidebarOpen,
    setIsRightSidebarOpen,
    handleLeftResizeStart,
    handleRightResizeStart,
  } = useSidebarResize();

  const {
    sections,
    selectedBook,
    elapsedTime,
    isRunning,
    showOnboarding,
    customQuotes,
    setElapsedTime,
    setIsRunning,
    addSection,
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
    resetTimer,
    closeOnboarding,
    openOnboarding,
  } = useReadingWorkspace(userId, initialBook);

  const handleBookSelect = useCallback(
    (book: SelectedBook) => {
      selectBook(book);
      setIsSearchOpen(false);
      setIsBookInfoOpen(true);
    },
    [selectBook]
  );

  const handleClearBook = useCallback(() => {
    selectBook(null);
    setIsBookInfoOpen(false);
  }, [selectBook]);

  return (
    <>
      {/* 모바일 안내 */}
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center md:hidden">
        <Monitor className="size-12 text-text-secondary" />
        <div>
          <p className="text-lg font-medium text-text-primary">{t("desktopOnly")}</p>
          <p className="mt-2 text-sm text-text-secondary">
            {t("desktopOnlyDesc")}
          </p>
        </div>
      </div>

      {/* 데스크톱 워크스페이스 */}
      <div className="hidden h-dvh flex-col md:flex">
      {/* 헤더 */}
      <WorkspaceHeader
        selectedBook={selectedBook}
        isBookLocked={isBookLocked}
        isBookInfoOpen={isBookInfoOpen}
        isLeftSidebarOpen={isLeftSidebarOpen}
        isRightSidebarOpen={isRightSidebarOpen}
        isRunning={isRunning}
        elapsedTime={elapsedTime}
        onToggleLeftSidebar={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
        onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        onToggleBookInfo={() => setIsBookInfoOpen(!isBookInfoOpen)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onClearBook={handleClearBook}
        onToggleTimer={() => setIsRunning(!isRunning)}
        onTimeUpdate={setElapsedTime}
        onResetTimer={resetTimer}
      />

      {/* #region 메인 컨텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 사이드바: 섹션 관리 */}
        {isLeftSidebarOpen && (
          <div className="relative flex shrink-0" style={{ width: leftWidth }}>
            <LeftSidebar
              sections={sections}
              onAddSection={addSection}
              onToggleVisibility={toggleSectionVisibility}
              onDeleteSection={deleteSection}
              onUpdateTitle={(id, title) => updateSection(id, { title })}
              onReorder={reorderSections}
            />
            {/* 좌측 리사이즈 핸들 */}
            <div
              onMouseDown={handleLeftResizeStart}
              className="absolute -end-1 top-0 z-20 h-full w-2 cursor-col-resize hover:bg-accent/30"
            />
          </div>
        )}

        {/* 중앙: 캔버스 영역 */}
        <main className="relative flex-1 overflow-hidden bg-main">
          {/* 빈 상태 안내 */}
          {sections.filter(s => s.isVisible).length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center text-text-secondary">
                {selectedBook ? (
                  <p className="text-lg">
                    <span className="font-medium text-text-primary">{selectedBook.title}</span>
                    <span className="text-text-tertiary">{t("readingBook")}</span>
                  </p>
                ) : (
                  <>
                    <p className="text-lg">{t("addSectionPrompt")}</p>
                    <p className="mt-2 text-sm opacity-70">
                      {t("addSectionHint")}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 책 정보 윈도우 */}
          {selectedBook && isBookInfoOpen && (
            <BookInfoWindow book={selectedBook} onClose={() => setIsBookInfoOpen(false)} />
          )}

          {/* 섹션 윈도우들 */}
          {sections
            .filter((s) => s.isVisible)
            .map((section) => (
              <SectionWindow
                key={section.id}
                section={section}
                isActive={activeSection === section.id}
                onFocus={() => setActiveSection(section.id)}
                onUpdate={(updates) => updateSection(section.id, updates)}
                onClose={() => toggleSectionVisibility(section.id)}
                onAddCharacter={() => addCharacter(section.id)}
                onUpdateCharacter={(charId, updates) =>
                  updateCharacter(section.id, charId, updates)
                }
                onDeleteCharacter={(charId) => deleteCharacter(section.id, charId)}
              />
            ))}

        </main>

        {/* 우측 사이드바: 독서 지원 섹션 */}
        {isRightSidebarOpen && (
          <SupportSidebar
            width={rightWidth}
            customQuotes={customQuotes}
            onResizeStart={handleRightResizeStart}
            onAddQuote={addQuote}
            onUpdateQuote={updateQuote}
            onDeleteQuote={deleteQuote}
            onReopenGuide={openOnboarding}
          />
        )}
      </div>
      {/* #endregion */}

      {/* 책 검색 모달 */}
      <BookSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelect={handleBookSelect}
      />

      {/* 사용 안내 모달 */}
      <OnboardingModal isOpen={showOnboarding} onClose={closeOnboarding} />
      </div>
    </>
  );
}
