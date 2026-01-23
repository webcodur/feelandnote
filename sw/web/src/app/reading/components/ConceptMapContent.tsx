/*
  파일명: /app/reading/components/ConceptMapContent.tsx
  기능: 개념 맵 섹션 컴포넌트
  책임: 계층적 개념 구조를 트리 형태로 시각화
*/ // ------------------------------

"use client";

import React, { useState } from "react";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Network } from "lucide-react";
import type { ConceptInfo } from "../types";

interface Props {
  concepts: ConceptInfo[];
  onUpdate: (concepts: ConceptInfo[]) => void;
}

export default function ConceptMapContent({ concepts, onUpdate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ConceptInfo>>({});
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const selectedConcept = concepts.find((c) => c.id === selectedId);
  const editingConcept = concepts.find((c) => c.id === editingId);

  const toggleCollapse = (id: string) => {
    const newSet = new Set(collapsedIds);
    collapsedIds.has(id) ? newSet.delete(id) : newSet.add(id);
    setCollapsedIds(newSet);
  };

  const handleAdd = (parentId: string | null = null) => {
    const parent = parentId ? concepts.find((c) => c.id === parentId) : null;
    const newConcept: ConceptInfo = {
      id: `concept-${Date.now()}`,
      name: "새 개념",
      description: "",
      parentId,
      level: parent ? parent.level + 1 : 0,
    };
    onUpdate([...concepts, newConcept]);
    setSelectedId(newConcept.id);
    setEditingId(newConcept.id);
    setEditForm(newConcept);
  };

  const handleEdit = (concept: ConceptInfo) => {
    setEditingId(concept.id);
    setEditForm({ ...concept });
  };

  const handleSave = () => {
    if (!editingId || !editForm.name) return;

    onUpdate(
      concepts.map((c) =>
        c.id === editingId ? { ...c, ...editForm } as ConceptInfo : c
      )
    );
    setEditingId(null);
    setEditForm({});
  };

  const handleCancel = () => {
    if (editingConcept && !editingConcept.name) {
      onUpdate(concepts.filter((c) => c.id !== editingId));
      setSelectedId(null);
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    const childrenExist = concepts.some((c) => c.parentId === id);
    if (childrenExist) {
      alert("하위 개념이 있는 경우 삭제할 수 없습니다.");
      return;
    }
    if (!confirm("이 개념을 삭제하시겠습니까?")) return;

    onUpdate(concepts.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) {
      setEditingId(null);
      setEditForm({});
    }
  };

  // 트리 구조 생성
  const buildTree = (parentId: string | null = null): ConceptInfo[] =>
    concepts
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));

  const renderTree = (parentId: string | null = null, depth: number = 0): React.JSX.Element[] => {
    const children = buildTree(parentId);

    return children.map((concept) => {
      const hasChildren = concepts.some((c) => c.parentId === concept.id);
      const isCollapsed = collapsedIds.has(concept.id);
      const isSelected = selectedId === concept.id;

      return (
        <div key={concept.id}>
          <div className="flex items-center gap-1">
            {/* 들여쓰기 */}
            <div style={{ width: `${depth * 16}px` }} />

            {/* 펼치기/접기 버튼 */}
            {hasChildren ? (
              <button
                onClick={() => toggleCollapse(concept.id)}
                className="shrink-0 p-0.5 text-text-tertiary hover:text-text-secondary"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}

            {/* 개념 카드 */}
            <button
              onClick={() => setSelectedId(concept.id)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-left text-xs transition-all ${
                isSelected
                  ? "border-accent bg-accent/10 font-medium text-accent"
                  : "border-border bg-white/5 text-text-primary hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {concept.name}
            </button>
          </div>

          {/* 하위 개념 재귀 렌더링 */}
          {hasChildren && !isCollapsed && renderTree(concept.id, depth + 1)}
        </div>
      );
    });
  };

  const rootConcepts = buildTree(null);

  return (
    <div className="flex h-full gap-3">
      {/* 왼쪽: 개념 트리 */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
        <button
          onClick={() => handleAdd(null)}
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 py-2 text-xs font-medium text-accent hover:border-accent/50 hover:bg-accent/10"
        >
          <Plus className="size-3.5" />
          최상위 개념 추가
        </button>

        {rootConcepts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <Network className="size-8 text-text-tertiary/30" />
            <p className="text-xs text-text-secondary">개념이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-1">{renderTree()}</div>
        )}
      </div>

      {/* 오른쪽: 상세/편집 뷰 */}
      <div className="w-64 flex flex-col rounded-lg border border-border bg-[#1a1f27] p-3 overflow-y-auto custom-scrollbar">
        {!selectedConcept ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <Network className="size-8 text-text-tertiary/30" />
            <p className="text-xs text-text-secondary">
              개념을 선택하여
              <br />
              상세 정보를 확인하세요
            </p>
          </div>
        ) : editingId === selectedConcept.id ? (
          // 편집 모드
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-text-secondary">개념 편집</p>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">개념명</label>
              <input
                type="text"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="개념 이름"
                className="w-full rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-text-secondary">설명</label>
              <textarea
                value={editForm.description || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="상세 설명"
                rows={6}
                className="w-full resize-none rounded-lg border border-border bg-black/30 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none custom-scrollbar"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={!editForm.name}
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
              <div className="flex items-center gap-1.5 mb-1">
                <div className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  Level {selectedConcept.level}
                </div>
              </div>
              <h3 className="text-base font-bold text-text-primary">
                {selectedConcept.name}
              </h3>
            </div>

            {selectedConcept.description && (
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {selectedConcept.description}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleAdd(selectedConcept.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 py-2 text-xs font-medium text-accent hover:bg-accent/20"
              >
                <Plus className="size-3" />
                하위 추가
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(selectedConcept)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white/5 py-2 text-xs font-medium text-text-primary hover:bg-white/10"
              >
                <Pencil className="size-3" />
                편집
              </button>
              <button
                onClick={() => handleDelete(selectedConcept.id)}
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
