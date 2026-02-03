/*
  파일명: /app/reading/components/ReadingWorkspace.tsx
  기능: 독서 모드 워크스페이스
  책임: 좌측 사이드바 + 캔버스 섹션 + 우측 지원 섹션을 통합한다.
*/ // ------------------------------

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  HelpCircle,
  BookMarked,
  Lightbulb,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  BookOpen,
  Film,
  Gamepad2,
  Music,
  Menu,
  Monitor,
} from "lucide-react";
import LeftSidebar from "./LeftSidebar";
import SectionWindow from "./SectionWindow";
import Stopwatch from "./Stopwatch";
import BookSearchModal from "./BookSearchModal";
import BookInfoWindow from "./BookInfoWindow";
import AiGenerationPanel from "./AiGenerationPanel";
import RotatingQuote from "./RotatingQuote";
import OnboardingModal from "./OnboardingModal";
import { useReadingWorkspace } from "../hooks/useReadingWorkspace";
import {
  READING_QUESTIONS,
  READING_QUOTES,
  READING_REASONS,
  READING_METHODS,
} from "../constants";
import type { SelectedBook, Section, SectionType } from "../types";
import type { AiGeneratedSection } from "../actions/askAiQuestion";

const SIDEBAR_STORAGE_KEY = "reading_sidebar_widths";
const DEFAULT_LEFT_WIDTH = 224; // w-56 = 14rem = 224px
const DEFAULT_RIGHT_WIDTH = 320; // w-80 = 20rem = 320px
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;

interface Props {
  userId?: string;
  initialBook?: SelectedBook; // 고정된 책 (URL에서 전달)
  isBookLocked?: boolean; // 책 변경 불가 여부
}

// 감상 모드 탭 (추후 확장 가능)
const WORKSPACE_TABS = [
  { id: "reading", label: "읽기", icon: BookOpen, enabled: true },
  { id: "watching", label: "감상", icon: Film, enabled: false },
  { id: "playing", label: "플레이", icon: Gamepad2, enabled: false },
  { id: "listening", label: "듣기", icon: Music, enabled: false },
] as const;

export default function ReadingWorkspace({ userId, initialBook, isBookLocked = false }: Props) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookInfoOpen, setIsBookInfoOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // #region 사이드바 리사이즈 & 토글
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const resizeStartRef = useRef({ x: 0, width: 0 });

  // 사이드바 너비 로드
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved) {
      try {
        const { left, right } = JSON.parse(saved);
        if (left) setLeftWidth(left);
        if (right) setRightWidth(right);
      } catch { /* ignore */ }
    }
  }, []);

  // 사이드바 너비 저장
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify({ left: leftWidth, right: rightWidth }));
  }, [leftWidth, rightWidth]);

  // 좌측 리사이즈 핸들러
  useEffect(() => {
    if (!isResizingLeft) return;
    const handleMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)));
      setLeftWidth(newWidth);
    };
    const handleUp = () => setIsResizingLeft(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizingLeft]);

  // 우측 리사이즈 핸들러
  useEffect(() => {
    if (!isResizingRight) return;
    const handleMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, resizeStartRef.current.width - (e.clientX - resizeStartRef.current.x)));
      setRightWidth(newWidth);
    };
    const handleUp = () => setIsResizingRight(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizingRight]);

  const handleLeftResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, width: leftWidth };
    setIsResizingLeft(true);
  };

  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, width: rightWidth };
    setIsResizingRight(true);
  };
  // #endregion

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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleAddAiSections = useCallback((generatedSections: AiGeneratedSection[]) => {
    const processedSections = generatedSections.map(gs => {
      let data = gs.data;

      // 인물 조직도 섹션의 경우 데이터 정규화 필요
      if (gs.type === "character" && data && "characters" in data) {
        const characters = (data as any).characters || [];
        
        // 1. 모든 인물에게 ID 할당 및 이름 매핑 생성
        const nameToIdMap: Record<string, string> = {};
        const normalizedCharacters = characters.map((char: any) => {
          const id = char.id || crypto.randomUUID();
          if (char.names && Array.isArray(char.names)) {
            char.names.forEach((name: string) => {
              if (name) nameToIdMap[name] = id;
            });
          }
          return { ...char, id };
        });

        // 2. targetName을 targetId로 변환
        const finalCharacters = normalizedCharacters.map((char: any) => {
          const relations = (char.relations || []).map((rel: any) => {
            if (rel.targetName && !rel.targetId) {
              return {
                type: rel.type,
                targetId: nameToIdMap[rel.targetName] || rel.targetName // 매핑 실패 시 이름 그대로 유지 (에러 방지)
              };
            }
            return rel;
          });
          return { ...char, relations };
        });

        data = { ...data, characters: finalCharacters };
      }

      return {
        title: gs.title,
        type: gs.type,
        data,
        size: gs.type === "character" ? { width: 600, height: 400 } : { width: 320, height: 260 }
      };
    });

    addSections(processedSections);
  }, [addSections]);

  return (
    <>
      {/* 모바일 안내 */}
      <div className="flex h-dvh flex-col items-center justify-center gap-4 p-6 text-center md:hidden">
        <Monitor className="size-12 text-text-secondary" />
        <div>
          <p className="text-lg font-medium text-text-primary">데스크톱 전용 기능</p>
          <p className="mt-2 text-sm text-text-secondary">
            독서 모드는 데스크톱에서만 이용 가능합니다.
          </p>
        </div>
      </div>

      {/* 데스크톱 워크스페이스 */}
      <div className="hidden h-dvh flex-col md:flex">
      {/* #region 헤더 */}
      <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-border bg-secondary px-4">
        {/* 좌측 컨트롤 그룹 */}
        <div className="flex items-center gap-3">
          {/* 좌측 사이드바 토글 (햄버거) */}
          <button
            onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
            className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
              isLeftSidebarOpen ? "bg-accent/10 text-accent" : "hover:bg-white/5 text-text-secondary"
            }`}
            title="좌측 사이드바 토글"
          >
            <Menu className="size-5" />
          </button>

          {/* 뒤로 가기 */}
          <button
            onClick={() => router.back()}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary"
            title="나가기"
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="mx-1 h-4 w-px bg-white/10" />

          {/* 감상 모드 드롭다운 (아이콘만 표시) */}
          <div className="relative">
            <button
              onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
              className="flex size-8 items-center justify-center rounded-lg bg-accent/20 text-accent hover:bg-accent/30"
              title="모드 전환"
            >
              <BookOpen className="size-5" />
            </button>
            
            {isModeDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsModeDropdownOpen(false)} 
                />
                <div className="absolute top-full left-0 z-50 mt-1 w-32 rounded-lg border border-border bg-[#1a1f27] p-1 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  {WORKSPACE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        disabled={!tab.enabled}
                        className={`flex w-full items-center gap-2 rounded px-2 py-2 text-xs font-medium ${
                          tab.id === "reading"
                            ? "bg-accent/20 text-accent"
                            : tab.enabled
                              ? "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                              : "cursor-not-allowed text-text-tertiary opacity-50"
                        }`}
                      >
                        <Icon className="size-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 책 정보 / 검색 */}
          {selectedBook ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBookInfoOpen(!isBookInfoOpen)}
                className={`flex items-center gap-2 rounded-lg py-1.5 px-3 transition-colors ${
                  isBookInfoOpen
                    ? "bg-accent/20 text-accent ring-1 ring-accent"
                    : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
                }`}
                title="책 정보 (클릭하여 상세 보기)"
              >
                <BookMarked className="size-4 shrink-0" />
                <span className="text-sm font-medium opacity-50 select-none">-</span>
                <span className="max-w-[200px] truncate text-sm font-medium">
                  {selectedBook.title}
                </span>
              </button>

              {!isBookLocked && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setIsSearchOpen(true)}
                    className="flex size-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-white/5 hover:text-text-secondary"
                    title="다른 책 선택"
                  >
                    <Search className="size-4" />
                  </button>
                  <button
                    onClick={handleClearBook}
                    className="flex size-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-white/5 hover:text-text-secondary"
                    title="책 선택 해제"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            !isBookLocked && (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
              >
                <Search className="size-4" />
                <span className="text-sm">책 선택</span>
              </button>
            )
          )}
        </div>

        {/* 중앙 타이머 (절대 위치로 중앙 정렬) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Stopwatch
            isRunning={isRunning}
            elapsedTime={elapsedTime}
            onToggle={() => setIsRunning(!isRunning)}
            onTimeUpdate={setElapsedTime}
            onReset={resetTimer}
          />
        </div>

        {/* 우측 사이드바 토글 (햄버거) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
              isRightSidebarOpen ? "bg-accent/10 text-accent" : "hover:bg-white/5 text-text-secondary"
            }`}
            title="우측 사이드바 토글"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>
      {/* #endregion */}

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
                    <span className="text-text-tertiary">을(를)</span> 읽고 있습니다.
                  </p>
                ) : (
                  <>
                    <p className="text-lg">좌측에서 섹션을 추가하세요</p>
                    <p className="mt-2 text-sm opacity-70">
                      메모, 조직, 이미지 섹션을 자유롭게 배치할 수 있습니다
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

          {/* 우측 하단 AI 플로팅 버튼 */}
          <button
            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
            className={`absolute bottom-6 right-6 z-50 flex size-12 items-center justify-center rounded-full shadow-2xl transition-all active:scale-95 ${
              isAiPanelOpen 
                ? "bg-accent text-white rotate-90" 
                : "bg-[#1a1f27] text-accent border border-accent/30 hover:bg-accent hover:text-white"
            }`}
            title="인물 관계 분석 AI"
          >
            {isAiPanelOpen ? <X className="size-6" /> : <Sparkles className="size-6" />}
          </button>

          {/* AI 패널 오버레이 */}
          {isAiPanelOpen && (
            <div className="absolute bottom-20 right-6 z-50 w-80 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <AiGenerationPanel
                selectedBook={selectedBook}
                notes={sections.filter(s => s.type === 'basic').map(s => (s.data as any).content || '')}
                onAddSections={handleAddAiSections}
              />
            </div>
          )}
        </main>

        {/* 우측 사이드바: 독서 지원 섹션 */}
        {isRightSidebarOpen && (
          <div className="relative hidden shrink-0 lg:flex" style={{ width: rightWidth }}>
            {/* 우측 리사이즈 핸들 */}
            <div
              onMouseDown={handleRightResizeStart}
              className="absolute -start-1 top-0 z-20 h-full w-2 cursor-col-resize hover:bg-accent/30"
            />
            <aside className="flex-1 overflow-y-auto border-s border-border bg-secondary p-4">
              {/* 로테이션 명언 */}
              <RotatingQuote
                quotes={customQuotes}
                onAdd={addQuote}
                onUpdate={updateQuote}
                onDelete={deleteQuote}
              />

            {/* 저장소 안내 */}
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-200/80">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>
                메모는 브라우저 로컬 스토리지에 저장됩니다. 브라우저 데이터를 삭제하거나 다른 기기 접근 시 메모를 볼 수 없습니다.
              </p>
            </div>

            {/* 독서 질문 */}
            <CollapsibleSection
              title="독서 시 던질 질문들"
              icon={<HelpCircle className="size-4" />}
              isExpanded={expandedSection === "questions"}
              onToggle={() => toggleSection("questions")}
            >
              {READING_QUESTIONS.map((group) => (
                <div key={group.category} className="mb-3">
                  <p className="mb-1.5 text-xs font-semibold text-accent">{group.category}</p>
                  <ul className="space-y-1">
                    {group.questions.map((q, i) => (
                      <li key={i} className="text-xs leading-relaxed text-text-secondary">
                        • {q}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CollapsibleSection>

            {/* 독서의 이유 */}
            <CollapsibleSection
              title="독서를 해야 하는 이유"
              icon={<Lightbulb className="size-4" />}
              isExpanded={expandedSection === "reasons"}
              onToggle={() => toggleSection("reasons")}
            >
              <ul className="space-y-2">
                {READING_REASONS.map((reason, i) => (
                  <li key={i}>
                    <p className="text-xs font-medium text-text-primary">{reason.title}</p>
                    <p className="text-xs text-text-secondary">{reason.description}</p>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>

            {/* 독서 방법론 */}
            <CollapsibleSection
              title="독서 방법론"
              icon={<BookMarked className="size-4" />}
              isExpanded={expandedSection === "methods"}
              onToggle={() => toggleSection("methods")}
            >
              {READING_METHODS.map((method, i) => (
                <div key={i} className="mb-3">
                  <p className="text-xs font-semibold text-accent">{method.name}</p>
                  <p className="mb-1 text-xs text-text-secondary">{method.description}</p>
                  <ol className="list-inside list-decimal text-xs text-text-secondary">
                    {method.steps.map((step, j) => (
                      <li key={j}>{step}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </CollapsibleSection>

            {/* 사용 안내 다시 보기 버튼 */}
            <button
              onClick={openOnboarding}
              className="mt-4 w-full rounded-lg bg-white/5 py-2 text-sm text-text-secondary hover:bg-white/10"
            >
              사용 안내 다시 보기
            </button>
            </aside>
          </div>
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

// #region 접이식 섹션 컴포넌트
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="mb-3 rounded-xl bg-white/5">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-3 text-start"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </div>
        {isExpanded ? (
          <ChevronUp className="size-4 text-text-secondary" />
        ) : (
          <ChevronDown className="size-4 text-text-secondary" />
        )}
      </button>
      {isExpanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}
// #endregion
