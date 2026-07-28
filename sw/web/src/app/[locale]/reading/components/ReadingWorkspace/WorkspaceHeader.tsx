/*
  파일명: /app/reading/components/ReadingWorkspace/WorkspaceHeader.tsx
  기능: 워크스페이스 헤더
  책임: 사이드바 토글, 감상 모드 드롭다운, 책 정보/검색, 중앙 타이머를 표시한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowLeft,
  Search,
  BookMarked,
  X,
  BookOpen,
  Film,
  Gamepad2,
  Music,
  Menu,
} from "lucide-react";
import Stopwatch from "../Stopwatch";
import type { SelectedBook } from "../../types";

// 감상 모드 탭 (추후 확장 가능)
const WORKSPACE_TABS = [
  { id: "reading", key: "reading", icon: BookOpen, enabled: true },
  { id: "watching", key: "watching", icon: Film, enabled: false },
  { id: "playing", key: "playing", icon: Gamepad2, enabled: false },
  { id: "listening", key: "listening", icon: Music, enabled: false },
] as const;

interface Props {
  selectedBook: SelectedBook | null;
  isBookLocked: boolean;
  isBookInfoOpen: boolean;
  isLeftSidebarOpen: boolean;
  isRightSidebarOpen: boolean;
  isRunning: boolean;
  elapsedTime: number;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onToggleBookInfo: () => void;
  onOpenSearch: () => void;
  onClearBook: () => void;
  onToggleTimer: () => void;
  onTimeUpdate: (time: number) => void;
  onResetTimer: () => void;
}

export default function WorkspaceHeader({
  selectedBook,
  isBookLocked,
  isBookInfoOpen,
  isLeftSidebarOpen,
  isRightSidebarOpen,
  isRunning,
  elapsedTime,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onToggleBookInfo,
  onOpenSearch,
  onClearBook,
  onToggleTimer,
  onTimeUpdate,
  onResetTimer,
}: Props) {
  const t = useTranslations("reading.workspace");
  const tt = useTranslations("reading.workspace.tabs");
  const router = useRouter();
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-border bg-secondary px-4">
      {/* 좌측 컨트롤 그룹 */}
      <div className="flex items-center gap-3">
        {/* 좌측 사이드바 토글 (햄버거) */}
        <button
          onClick={onToggleLeftSidebar}
          className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
            isLeftSidebarOpen ? "bg-accent/10 text-accent" : "hover:bg-white/5 text-text-secondary"
          }`}
          title={t("leftSidebarToggle")}
        >
          <Menu className="size-5" />
        </button>

        {/* 뒤로 가기 */}
        <button
          onClick={() => router.back()}
          className="flex size-8 items-center justify-center rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary"
          title={t("exit")}
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="mx-1 h-4 w-px bg-white/10" />

        {/* 감상 모드 드롭다운 (아이콘만 표시) */}
        <div className="relative">
          <button
            onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
            className="flex size-8 items-center justify-center rounded-lg bg-accent/20 text-accent hover:bg-accent/30"
            title={t("modeSwitch")}
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
                            : "cursor-not-allowed  opacity-50"
                      }`}
                    >
                      <Icon className="size-4" />
                      {tt(tab.key)}
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
              onClick={onToggleBookInfo}
              className={`flex items-center gap-2 rounded-lg py-1.5 px-3 transition-colors ${
                isBookInfoOpen
                  ? "bg-accent/20 text-accent ring-1 ring-accent"
                  : "bg-white/5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
              }`}
              title={t("bookInfo")}
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
                  onClick={onOpenSearch}
                  className="flex size-8 items-center justify-center rounded-lg hover:bg-white/5 hover:text-text-secondary"
                  title={t("changeBook")}
                >
                  <Search className="size-4" />
                </button>
                <button
                  onClick={onClearBook}
                  className="flex size-8 items-center justify-center rounded-lg hover:bg-white/5 hover:text-text-secondary"
                  title={t("clearBook")}
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          !isBookLocked && (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
            >
              <Search className="size-4" />
              <span className="text-sm">{t("selectBook")}</span>
            </button>
          )
        )}
      </div>

      {/* 중앙 타이머 (절대 위치로 중앙 정렬) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Stopwatch
          isRunning={isRunning}
          elapsedTime={elapsedTime}
          onToggle={onToggleTimer}
          onTimeUpdate={onTimeUpdate}
          onReset={onResetTimer}
        />
      </div>

      {/* 우측 사이드바 토글 (햄버거) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRightSidebar}
          className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
            isRightSidebarOpen ? "bg-accent/10 text-accent" : "hover:bg-white/5 text-text-secondary"
          }`}
          title={t("rightSidebarToggle")}
        >
          <Menu className="size-5" />
        </button>
      </div>
    </header>
  );
}
