/*
  파일명: /components/features/archive/note/SectionList.tsx
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
  onAdd: (title: string) => void;
  onUpdate: (id: string, updates: { title?: string; memo?: string }) => void;
  onDelete: (id: string) => void;
}

export default function SectionList({ sections, isSaving, onAdd, onUpdate, onDelete }: SectionListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd(newTitle);
    setNewTitle("");
    setIsAdding(false);
  };

  return (
    <Card className="p-0">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <List size={18} /> 구획별 기록
        </h3>

        <div className="space-y-3">
          {sections.map((section) => (
            <SectionItem key={section.id} section={section} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>

        {isAdding ? (
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="구획명을 입력하세요 (예: 1장, E01)"
              className="flex-1 bg-black/20 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setIsAdding(false);
              }}
            />
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={isSaving}>추가</Button>
            <Button variant="secondary" size="sm" onClick={() => setIsAdding(false)}>취소</Button>
          </div>
        ) : (
          <Button
            unstyled
            onClick={() => setIsAdding(true)}
            className="mt-4 w-full p-3 bg-transparent border border-dashed border-border rounded-xl text-text-secondary text-sm flex items-center justify-center gap-2 hover:border-accent hover:text-accent"
          >
            <Plus size={14} /> 구획 추가
          </Button>
        )}
      </div>
    </Card>
  );
}
