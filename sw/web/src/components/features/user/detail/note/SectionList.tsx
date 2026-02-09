/*
  파일명: /components/features/user/note/SectionList.tsx
  기능: 노트 섹션 목록 컴포넌트
  책임: 섹션 목록을 표시하고 새 섹션 추가를 처리한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { List, Plus } from "lucide-react";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";
import SectionItem from "./SectionItem";
import type { NoteSection } from "@/actions/notes/types";

interface SectionListProps {
  sections: NoteSection[];
  isSaving: boolean;
  onAdd: (title: string, memo?: string) => void;
  onUpdate: (id: string, updates: { title?: string; memo?: string }) => void;
  onDelete: (id: string) => void;
}

export default function SectionList({ sections, isSaving, onAdd, onUpdate, onDelete }: SectionListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newMemo, setNewMemo] = useState("");
  const [isAdding, setIsAdding] = useState(sections.length === 0);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd(newTitle, newMemo);
    setNewTitle("");
    setNewMemo("");
    setIsAdding(false);
  };

  return (
    <div className="space-y-4 px-1">

      <div className="space-y-3">
        {sections.map((section) => (
          <SectionItem key={section.id} section={section} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>

      {isAdding ? (
        <div className="bg-white/[0.03] rounded-xl border border-white/5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="구획 제목 (예: 1장, E01)"
            className="w-full bg-transparent px-4 py-3 text-sm font-bold outline-none text-accent/80 placeholder:text-text-tertiary/20"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsAdding(false);
            }}
          />
          
          <hr className="border-white/5 mx-4" />

          <textarea
            value={newMemo}
            onChange={(e) => setNewMemo(e.target.value)}
            placeholder="이 구획에 대한 기록은 비공개로 안전하게 보관됩니다."
            className="w-full bg-transparent px-4 py-3 text-[14px] outline-none text-text-primary min-h-[120px] resize-none placeholder:text-text-tertiary/10"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAdd();
            }}
          />

          <div className="flex gap-2 justify-end p-2 bg-black/10 border-t border-white/5">
              {/* 버튼 제거됨 - Enter 키로 추가 유도 */}
              <span className="text-[9px] text-text-tertiary/30 italic mr-2">Press Enter + Ctrl to save</span>
          </div>
        </div>
      ) : (
        <Button
          unstyled
          onClick={() => setIsAdding(true)}
          className="w-full py-4 text-text-tertiary/40 text-[11px] flex items-center justify-center gap-2 hover:text-accent transition-all group uppercase tracking-widest font-bold border-t border-dashed border-white/5 mt-4"
        >
          <Plus size={12} className="group-hover:scale-110 transition-transform" /> 
          <span>Add New Section</span>
        </Button>
      )}
    </div>
  );
}
