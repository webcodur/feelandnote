/*
  파일명: /app/reading/[contentId]/ReadingSession.tsx
  기능: 리딩 세션 메인 컴포넌트
  책임: 스톱워치, 페이지 슬라이더, 캔버스 메모를 통합 관리한다.
*/ // ------------------------------

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Users } from "lucide-react";
import type { Content } from "@/types/database";
import Stopwatch from "./components/Stopwatch";
import StickyCanvas from "./components/StickyCanvas";
import PageSlider from "./components/PageSlider";
import { useReadingSession } from "./hooks/useReadingSession";
import type { StickyNote } from "./types";

interface Props {
  userContentId: string;
  content: Content;
  userId?: string;
}

export default function ReadingSession({ userContentId, content }: Props) {
  const router = useRouter();
  const {
    notes,
    currentPage,
    elapsedTime,
    isRunning,
    setCurrentPage,
    setElapsedTime,
    setIsRunning,
    addNote,
    updateNote,
    deleteNote,
    saveSession,
  } = useReadingSession(userContentId);

  // 책 메타데이터에서 총 페이지 수 추출
  const totalPages = (content.metadata as { pageCount?: number })?.pageCount ?? 0;

  const handleExit = useCallback(() => {
    saveSession();
    router.back();
  }, [router, saveSession]);

  const handleAddNote = useCallback(() => {
    const newNote: StickyNote = {
      id: crypto.randomUUID(),
      content: "",
      page: currentPage || undefined,
      color: "yellow",
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
      },
      createdAt: new Date().toISOString(),
    };
    addNote(newNote);
  }, [currentPage, addNote]);

  return (
    <div className="flex h-dvh flex-col">
      {/* #region 헤더 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-secondary px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExit}
            className="flex size-9 items-center justify-center rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-text-secondary" />
            <span className="font-medium line-clamp-1">{content.title}</span>
          </div>
        </div>

        <Stopwatch
          isRunning={isRunning}
          initialTime={elapsedTime}
          onToggle={() => setIsRunning(!isRunning)}
          onTimeUpdate={setElapsedTime}
        />
      </header>
      {/* #endregion */}

      {/* #region 캔버스 영역 */}
      <main className="relative flex-1 overflow-hidden bg-main">
        <StickyCanvas
          notes={notes}
          onUpdateNote={updateNote}
          onDeleteNote={deleteNote}
        />

        {/* 메모 추가 버튼 */}
        <button
          onClick={handleAddNote}
          className="absolute end-4 bottom-24 flex size-12 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:bg-accent-hover"
        >
          <span className="text-2xl leading-none">+</span>
        </button>

        {/* Coming Soon: 함께 읽기 */}
        <div className="absolute start-4 bottom-24 flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-text-secondary">
          <Users className="size-4" />
          <span>함께 읽기 (Coming Soon)</span>
        </div>
      </main>
      {/* #endregion */}

      {/* #region 하단 컨트롤 */}
      <footer className="shrink-0 border-t border-border bg-secondary px-4 py-3">
        <PageSlider
          currentPage={currentPage}
          totalPages={totalPages}
          onChange={setCurrentPage}
        />
      </footer>
      {/* #endregion */}
    </div>
  );
}
