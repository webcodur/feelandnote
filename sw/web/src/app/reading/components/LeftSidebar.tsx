/*
  파일명: /app/reading/components/LeftSidebar.tsx
  기능: 좌측 섹션 관리 사이드바
  책임: 섹션 추가/삭제/표시 토글을 관리한다.
*/ // ------------------------------

"use client";

import { useState } from "react";
import {
  Plus,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Users,
  Image,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Calendar,
  Network,
  Table as TableIcon,
  BookText,
} from "lucide-react";
import type { Section, SectionType } from "../types";
import { SECTION_TYPE_LABELS } from "../types";

interface Props {
  sections: Section[];
  onAddSection: (type: SectionType) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onReorder: (newSections: Section[]) => void;
}

const SECTION_TYPES: { type: SectionType; icon: typeof FileText; label: string }[] = [
  { type: "basic", icon: FileText, label: "메모" },
  { type: "character", icon: Users, label: "조직" },
  { type: "timeline", icon: Calendar, label: "타임라인" },
  { type: "conceptMap", icon: Network, label: "개념 맵" },
  { type: "comparison", icon: TableIcon, label: "비교표" },
  { type: "glossary", icon: BookText, label: "용어집" },
  { type: "image", icon: Image, label: "이미지" },
];

export default function LeftSidebar({
  sections,
  onAddSection,
  onToggleVisibility,
  onDeleteSection,
  onUpdateTitle,
  onReorder,
}: Props) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddSection = (type: SectionType) => {
    onAddSection(type);
    setIsAddMenuOpen(false);
  };

  const getIcon = (type: SectionType) => {
    const found = SECTION_TYPES.find((t) => t.type === type);
    return found ? found.icon : FileText;
  };

  // #region 드래그 앤 드롭 핸들러
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSections = [...sections];
    const [draggedItem] = newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, draggedItem);
    
    onReorder(newSections);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  // #endregion

  return (
    <aside className="flex h-full w-full flex-col border-e border-border bg-secondary">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="text-sm font-medium">섹션</span>
        <div className="relative">
          <button
            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
            className="flex size-7 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-hover"
            title="섹션 추가"
          >
            <Plus className="size-4" />
          </button>

          {/* 추가 메뉴 */}
          {isAddMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsAddMenuOpen(false)}
              />
              <div className="absolute end-0 top-full z-20 mt-1 w-32 rounded-lg border border-border bg-[#1a1f27] py-1 shadow-xl">
                {SECTION_TYPES.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => handleAddSection(type)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-white/5"
                  >
                    <Icon className="size-4 text-text-secondary" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 섹션 목록 */}
      <div className="flex-1 overflow-y-auto p-2">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
            <FileText className="mb-2 size-8 opacity-50" />
            <p className="text-xs">섹션이 없습니다</p>
            <p className="text-xs opacity-70">+ 버튼으로 추가하세요</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {sections.map((section, index) => {
              const Icon = getIcon(section.type);
              const isEditing = editingId === section.id;
              const isDragging = draggedIndex === index;
              const isOver = dragOverIndex === index;

              return (
                <li
                  key={section.id}
                  draggable={!isEditing}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group rounded-lg border transition-all ${
                    isOver ? "border-accent bg-accent/5 translate-y-1" : 
                    section.isVisible
                      ? "border-border bg-white/5"
                      : "border-border/30 bg-white/[0.03]"
                  } ${isDragging ? "opacity-30" : "opacity-100"}`}
                >
                  <div className="flex items-center gap-1 p-2">
                    <GripVertical className="size-3 shrink-0 cursor-grab text-text-tertiary" />
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      section.type === "basic" ? "bg-amber-500/10 text-amber-500" :
                      section.type === "character" ? "bg-blue-500/10 text-blue-400" :
                      section.type === "image" ? "bg-emerald-500/10 text-emerald-500" :
                      section.type === "timeline" ? "bg-purple-500/10 text-purple-400" :
                      section.type === "conceptMap" ? "bg-pink-500/10 text-pink-400" :
                      section.type === "comparison" ? "bg-orange-500/10 text-orange-400" :
                      "bg-cyan-500/10 text-cyan-400"
                    }`}>
                      <Icon className="size-4.5" />
                    </div>

                    {isEditing ? (
                      <input
                        type="text"
                        defaultValue={section.title}
                        autoFocus
                        onBlur={(e) => {
                          onUpdateTitle(section.id, e.target.value);
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onUpdateTitle(section.id, e.currentTarget.value);
                            setEditingId(null);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="min-w-0 flex-1 rounded-sm bg-white/10 px-1 py-0.5 text-xs outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => setEditingId(section.id)}
                        className={`min-w-0 flex-1 cursor-text truncate text-sm font-medium ${
                          !section.isVisible && "opacity-70"
                        }`}
                        title={section.title}
                      >
                        {section.title}
                      </span>
                    )}

                    {/* 액션 버튼 */}
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => onToggleVisibility(section.id)}
                        className={`rounded p-1 transition-all ${
                          section.isVisible
                            ? "text-accent hover:bg-accent/10"
                            : "text-text-tertiary hover:bg-white/10 opacity-40 hover:opacity-100"
                        }`}
                        title={section.isVisible ? "숨기기" : "표시"}
                      >
                        {section.isVisible ? (
                          <Eye className="size-3" />
                        ) : (
                          <EyeOff className="size-3" />
                        )}
                      </button>
                      <button
                        onClick={() => onDeleteSection(section.id)}
                        className="rounded p-1 text-red-400 hover:bg-red-500/20"
                        title="삭제"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>


                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
