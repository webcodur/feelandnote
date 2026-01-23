/*
  파일명: /app/reading/components/ComparisonContent.tsx
  기능: 비교표 섹션 컴포넌트
  책임: 여러 항목을 기준별로 비교하여 테이블 형태로 표시
*/ // ------------------------------

"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Table } from "lucide-react";
import type { ComparisonItem } from "../types";

interface Props {
  items: ComparisonItem[];
  criteriaOrder: string[];
  onUpdate: (items: ComparisonItem[], criteriaOrder: string[]) => void;
}

export default function ComparisonContent({ items, criteriaOrder, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ComparisonItem>>({});
  const [newCriterion, setNewCriterion] = useState("");

  const editingItem = items.find((item) => item.id === editingId);

  const handleAddItem = () => {
    const newItem: ComparisonItem = {
      id: `item-${Date.now()}`,
      name: "새 항목",
      criteria: {},
    };
    onUpdate([...items, newItem], criteriaOrder);
    setEditingId(newItem.id);
    setEditForm(newItem);
  };

  const handleAddCriterion = () => {
    if (!newCriterion.trim() || criteriaOrder.includes(newCriterion.trim())) return;
    onUpdate(items, [...criteriaOrder, newCriterion.trim()]);
    setNewCriterion("");
  };

  const handleDeleteCriterion = (criterion: string) => {
    if (!confirm(`"${criterion}" 기준을 삭제하시겠습니까?`)) return;
    const newItems = items.map((item) => {
      const newCriteria = { ...item.criteria };
      delete newCriteria[criterion];
      return { ...item, criteria: newCriteria };
    });
    onUpdate(newItems, criteriaOrder.filter((c) => c !== criterion));
  };

  const handleEdit = (item: ComparisonItem) => {
    setEditingId(item.id);
    setEditForm({ ...item, criteria: { ...item.criteria } });
  };

  const handleSave = () => {
    if (!editingId || !editForm.name) return;

    onUpdate(
      items.map((item) =>
        item.id === editingId ? { ...item, ...editForm } as ComparisonItem : item
      ),
      criteriaOrder
    );
    setEditingId(null);
    setEditForm({});
  };

  const handleCancel = () => {
    if (editingItem && !editingItem.name) {
      onUpdate(
        items.filter((item) => item.id !== editingId),
        criteriaOrder
      );
    }
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    if (!confirm("이 항목을 삭제하시겠습니까?")) return;
    onUpdate(
      items.filter((item) => item.id !== id),
      criteriaOrder
    );
    if (editingId === id) {
      setEditingId(null);
      setEditForm({});
    }
  };

  const updateCriteria = (criterion: string, value: string) => {
    if (!editForm.criteria) return;
    setEditForm({
      ...editForm,
      criteria: { ...editForm.criteria, [criterion]: value },
    });
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* 상단: 기준 관리 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newCriterion}
          onChange={(e) => setNewCriterion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddCriterion()}
          placeholder="새 비교 기준 추가 (예: 가격, 성능, 디자인)"
          className="flex-1 rounded-lg border border-border bg-black/30 px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary/30 focus:border-accent focus:outline-none"
        />
        <button
          onClick={handleAddCriterion}
          disabled={!newCriterion.trim()}
          className="rounded-lg border border-accent/30 bg-accent/10 px-4 text-xs font-medium text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          기준 추가
        </button>
      </div>

      {/* 비교표 */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Table className="size-8 text-text-tertiary/30" />
            <p className="text-xs text-text-secondary">비교할 항목이 없습니다</p>
            <button
              onClick={handleAddItem}
              className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 px-4 py-2 text-xs font-medium text-accent hover:border-accent/50 hover:bg-accent/10"
            >
              <Plus className="size-3.5" />
              항목 추가
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-[#1a1f27] border border-border p-2 text-left text-xs font-semibold text-text-secondary">
                  항목
                </th>
                {criteriaOrder.map((criterion) => (
                  <th
                    key={criterion}
                    className="sticky top-0 bg-[#1a1f27] border border-border p-2 text-left text-xs font-semibold text-text-secondary min-w-[120px]"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span>{criterion}</span>
                      <button
                        onClick={() => handleDeleteCriterion(criterion)}
                        className="opacity-0 hover:opacity-100 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="sticky top-0 bg-[#1a1f27] border border-border p-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td className="border border-border p-2">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="w-full rounded border border-border bg-black/30 px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                        />
                      ) : (
                        <span className="text-xs font-medium text-text-primary">
                          {item.name}
                        </span>
                      )}
                    </td>
                    {criteriaOrder.map((criterion) => (
                      <td key={criterion} className="border border-border p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.criteria?.[criterion] || ""}
                            onChange={(e) => updateCriteria(criterion, e.target.value)}
                            className="w-full rounded border border-border bg-black/30 px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs text-text-secondary">
                            {item.criteria[criterion] || "-"}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="border border-border p-2">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button
                            onClick={handleSave}
                            disabled={!editForm.name}
                            className="flex-1 rounded bg-accent px-2 py-1 text-[10px] font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                          >
                            저장
                          </button>
                          <button
                            onClick={handleCancel}
                            className="flex-1 rounded bg-white/10 px-2 py-1 text-[10px] font-medium text-text-primary hover:bg-white/20"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 text-text-tertiary hover:text-accent"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1 text-text-tertiary hover:text-red-400"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 하단: 항목 추가 버튼 */}
      {items.length > 0 && (
        <button
          onClick={handleAddItem}
          className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-accent/30 bg-accent/5 py-2 text-xs font-medium text-accent hover:border-accent/50 hover:bg-accent/10"
        >
          <Plus className="size-3.5" />
          항목 추가
        </button>
      )}
    </div>
  );
}
