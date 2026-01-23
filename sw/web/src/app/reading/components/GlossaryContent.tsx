/*
  파일명: /app/reading/components/GlossaryContent.tsx
  기능: 용어집 섹션 컴포넌트
  책임: 책에 등장하는 전문 용어와 정의를 관리
*/ // ------------------------------

"use client";

import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Search, BookText } from "lucide-react";
import type { GlossaryTerm } from "../types";

interface Props {
  terms: GlossaryTerm[];
  onUpdate: (terms: GlossaryTerm[]) => void;
}

export default function GlossaryContent({ terms, onUpdate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GlossaryTerm>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("전체");

  const selectedTerm = terms.find((t) => t.id === selectedId);
  const editingTerm = terms.find((t) => t.id === editingId);

  // 카테고리 목록 추출
  const categories = useMemo(() => {
    const cats = new Set(terms.map((t) => t.category).filter(Boolean) as string[]);
    return ["전체", ...Array.from(cats).sort()];
  }, [terms]);

  // 필터링 및 검색
  const filteredTerms = useMemo(() => {
    let result = terms;

    if (filterCategory !== "전체") {
      result = result.filter((t) => t.category === filterCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.term.toLowerCase().includes(query) ||
          t.definition.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => a.term.localeCompare(b.term));
  }, [terms, filterCategory, searchQuery]);

  const handleAdd = () => {
    const newTerm: GlossaryTerm = {
      id: `term-${Date.now()}`,
      term: "",
      definition: "",
      category: filterCategory !== "전체" ? filterCategory : undefined,
    };
    onUpdate([...terms, newTerm]);
    setSelectedId(newTerm.id);
    setEditingId(newTerm.id);
    setEditForm(newTerm);
  };

  const handleEdit = (term: GlossaryTerm) => {
    setEditingId(term.id);
    setEditForm({ ...term });
  };

  const handleSave = () => {
    if (!editingId || !editForm.term || !editForm.definition) return;

    onUpdate(
      terms.map((t) =>
        t.id === editingId ? { ...t, ...editForm } as GlossaryTerm : t
      )
    );
    setEditingId(null);
    setEditForm({});
  };

  const handleCancel = () => {
    if (editingTerm && (!editingTerm.term || !editingTerm.definition)) {
      onUpdate(terms.filter((t) => t.id !== editingId));
      setSelectedId(null);
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    if (!confirm("이 용어를 삭제하시겠습니까?")) return;
    onUpdate(terms.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) {
      setEditingId(null);
      setEditForm({});
    }
  };

  return (
    <div className="flex h-full gap-3">
      {/* 왼쪽: 용어 리스트 */}
      <div className="flex-1 flex flex-col gap-2 overflow-hidden">
        {/* 검색 및 필터 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="용어 검색..."
              className="w-full rounded-lg border border-border bg-black/30 py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 py-2 text-xs font-medium text-accent hover:border-accent/50 hover:bg-accent/10"
        >
          <Plus className="size-3.5" />
          용어 추가
        </button>

        {/* 용어 리스트 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
          {filteredTerms.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <BookText className="size-8 text-text-tertiary/30" />
              <p className="text-xs text-text-secondary">
                {searchQuery || filterCategory !== "전체"
                  ? "검색 결과가 없습니다"
                  : "용어가 없습니다"}
              </p>
            </div>
          ) : (
            filteredTerms.map((term) => {
              const isSelected = selectedId === term.id;

              return (
                <button
                  key={term.id}
                  onClick={() => setSelectedId(term.id)}
                  className={`w-full rounded-lg border p-2 text-left transition-all ${
                    isSelected
                      ? "border-accent bg-accent/10"
                      : "border-border bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">
                      {term.term}
                    </span>
                    {term.category && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                        {term.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {term.definition}
                  </p>
                  {term.page && (
                    <p className="mt-1 text-[10px] text-text-tertiary">p. {term.page}</p>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 오른쪽: 상세/편집 뷰 */}
      <div className="w-64 flex flex-col rounded-lg border border-border bg-[#1a1f27] p-3 overflow-y-auto custom-scrollbar">
        {!selectedTerm ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <BookText className="size-8 text-text-tertiary/30" />
            <p className="text-xs text-text-secondary">
              용어를 선택하여
              <br />
              상세 정보를 확인하세요
            </p>
          </div>
        ) : editingId === selectedTerm.id ? (
          // 편집 모드
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-text-secondary">용어 편집</p>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">용어</label>
              <input
                type="text"
                value={editForm.term || ""}
                onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                placeholder="용어 입력"
                className="w-full rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">정의</label>
              <textarea
                value={editForm.definition || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, definition: e.target.value })
                }
                placeholder="정의 입력"
                rows={5}
                className="w-full resize-none rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none custom-scrollbar"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">카테고리</label>
              <input
                type="text"
                value={editForm.category || ""}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                placeholder="예: 역사, 철학, 경제"
                className="w-full rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">페이지</label>
              <input
                type="text"
                value={editForm.page || ""}
                onChange={(e) => setEditForm({ ...editForm, page: e.target.value })}
                placeholder="예: 42, 127-130"
                className="w-full rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={!editForm.term || !editForm.definition}
                className="flex-1 rounded-lg bg-accent py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-border bg-white/5 py-2 text-xs font-medium text-text-primary hover:bg-white/10"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          // 상세 보기 모드
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-lg font-bold text-text-primary">{selectedTerm.term}</h3>
                {selectedTerm.category && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                    {selectedTerm.category}
                  </span>
                )}
              </div>
              {selectedTerm.page && (
                <p className="text-[11px] text-text-tertiary">페이지: {selectedTerm.page}</p>
              )}
            </div>

            <div className="rounded-lg bg-white/5 p-2">
              <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                {selectedTerm.definition}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleEdit(selectedTerm)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 py-2 text-xs font-medium text-text-primary hover:bg-white/10"
              >
                <Pencil className="size-3" />
                편집
              </button>
              <button
                onClick={() => handleDelete(selectedTerm.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20"
              >
                <Trash2 className="size-3" />
                삭제
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
