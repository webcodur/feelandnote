/*
  파일명: /app/reading/[contentId]/components/StickyNoteItem.tsx
  기능: 개별 스티키 노트 컴포넌트
  책임: 드래그, 편집, 색상 변경, 삭제 기능을 제공한다.
*/ // ------------------------------

"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, GripVertical } from "lucide-react";
import type { StickyNote, NoteColor } from "../types";

interface Props {
  note: StickyNote;
  onUpdate: (updates: Partial<StickyNote>) => void;
  onDelete: () => void;
}

const colorStyles: Record<NoteColor, string> = {
  yellow: "bg-yellow-300/90 text-yellow-950",
  green: "bg-green-300/90 text-green-950",
  blue: "bg-blue-300/90 text-blue-950",
  purple: "bg-purple-300/90 text-purple-950",
  pink: "bg-pink-300/90 text-pink-950",
};

const colors: NoteColor[] = ["yellow", "green", "blue", "purple", "pink"];

export default function StickyNoteItem({ note, onUpdate, onDelete }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(!note.content);
  const [showColors, setShowColors] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
  const noteRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 새 메모면 자동 포커스
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // #region 드래그 핸들러
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      offsetX: note.position.x,
      offsetY: note.position.y,
    };

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDragMove);
    document.addEventListener("touchend", handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;

    const newX = Math.max(0, dragRef.current.offsetX + deltaX);
    const newY = Math.max(0, dragRef.current.offsetY + deltaY);

    onUpdate({ position: { x: newX, y: newY } });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
    document.removeEventListener("touchmove", handleDragMove);
    document.removeEventListener("touchend", handleDragEnd);
  };
  // #endregion

  return (
    <div
      ref={noteRef}
      className={`absolute w-48 rounded-lg shadow-lg ${colorStyles[note.color]} ${
        isDragging ? "scale-105 shadow-xl" : ""
      }`}
      style={{
        left: note.position.x,
        top: note.position.y,
        zIndex: isDragging ? 100 : 10,
      }}
    >
      {/* 헤더: 드래그 핸들 + 컨트롤 */}
      <div className="flex items-center justify-between px-2 py-1.5">
        <div
          className="flex cursor-grab items-center gap-1 active:cursor-grabbing"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <GripVertical className="size-4 opacity-50" />
          {note.page && (
            <span className="text-xs opacity-70">p.{note.page}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* 색상 선택 */}
          <div className="relative">
            <button
              onClick={() => setShowColors(!showColors)}
              className="size-5 rounded-full border-2 border-white/50"
              style={{ backgroundColor: `var(--color-${note.color})` }}
            />
            {showColors && (
              <div className="absolute end-0 top-6 z-50 flex gap-1 rounded-lg bg-card p-1.5 shadow-xl">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      onUpdate({ color });
                      setShowColors(false);
                    }}
                    className={`size-6 rounded-full ${colorStyles[color]} ${
                      color === note.color ? "ring-2 ring-white" : ""
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 삭제 */}
          <button
            onClick={onDelete}
            className="rounded p-0.5 opacity-50 hover:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="px-2 pb-2">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={note.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            onBlur={() => setIsEditing(false)}
            placeholder="메모 입력..."
            className="min-h-[80px] w-full resize-none bg-transparent text-sm placeholder:opacity-50 focus:outline-none"
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="min-h-[80px] cursor-text whitespace-pre-wrap text-sm"
          >
            {note.content || (
              <span className="opacity-50">메모 입력...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
