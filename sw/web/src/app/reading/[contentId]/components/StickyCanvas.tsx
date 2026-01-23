/*
  파일명: /app/reading/[contentId]/components/StickyCanvas.tsx
  기능: 스티키 노트 캔버스 컴포넌트
  책임: 포스트잇 메모들을 드래그 가능한 캔버스에 표시한다.
*/ // ------------------------------

"use client";

import type { StickyNote } from "../types";
import StickyNoteItem from "./StickyNoteItem";

interface Props {
  notes: StickyNote[];
  onUpdateNote: (id: string, updates: Partial<StickyNote>) => void;
  onDeleteNote: (id: string) => void;
}

export default function StickyCanvas({ notes, onUpdateNote, onDeleteNote }: Props) {
  // 빈 캔버스 안내
  if (notes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-text-secondary">
          <p className="text-lg">메모가 없습니다</p>
          <p className="mt-1 text-sm">
            우측 하단 <span className="text-accent">+</span> 버튼으로 메모를 추가하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {notes.map((note) => (
        <StickyNoteItem
          key={note.id}
          note={note}
          onUpdate={(updates) => onUpdateNote(note.id, updates)}
          onDelete={() => onDeleteNote(note.id)}
        />
      ))}
    </div>
  );
}
