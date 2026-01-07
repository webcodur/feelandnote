/*
  파일명: /components/features/archive/CategoryManager.tsx
  기능: 콘텐츠 타입별 카테고리(소분류) 관리 모달
  책임: 카테고리 생성, 수정, 삭제 기능을 제공한다.
*/ // ------------------------------
"use client";

import { useState, useCallback } from "react";
import { FolderPlus, Trash2, X, Loader2, Pencil, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import { createCategory } from "@/actions/categories/createCategory";
import { updateCategory } from "@/actions/categories/updateCategory";
import { deleteCategory } from "@/actions/categories/deleteCategory";
import type { ContentType, CategoryWithCount } from "@/types/database";
import { Z_INDEX } from "@/constants/zIndex";

interface CategoryManagerProps {
  contentType: ContentType;
  categories: CategoryWithCount[];
  onCategoriesChange: () => void;
  onClose: () => void;
}

export default function CategoryManager({
  contentType,
  categories,
  onCategoriesChange,
  onClose,
}: CategoryManagerProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // #region 생성
  const handleCreate = useCallback(async () => {
    if (!newCategoryName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      await createCategory({
        name: newCategoryName.trim(),
        contentType,
      });
      setNewCategoryName("");
      onCategoriesChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "분류 생성에 실패했습니다");
    } finally {
      setIsCreating(false);
    }
  }, [newCategoryName, contentType, onCategoriesChange]);
  // #endregion

  // #region 수정
  const handleStartEdit = (category: CategoryWithCount) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdate = useCallback(async () => {
    if (!editingId || !editingName.trim()) return;

    setIsUpdating(true);
    setError(null);

    try {
      await updateCategory({
        id: editingId,
        name: editingName.trim(),
      });
      setEditingId(null);
      setEditingName("");
      onCategoriesChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "분류 수정에 실패했습니다");
    } finally {
      setIsUpdating(false);
    }
  }, [editingId, editingName, onCategoriesChange]);
  // #endregion

  // #region 삭제
  const handleDelete = useCallback(async (categoryId: string) => {
    if (!confirm("이 분류를 삭제하시겠습니까? 해당 콘텐츠는 미분류로 이동됩니다.")) {
      return;
    }

    setDeletingId(categoryId);
    setError(null);

    try {
      await deleteCategory(categoryId);
      onCategoriesChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "분류 삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  }, [onCategoriesChange]);
  // #endregion

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isCreating) {
      handleCreate();
    }
  }, [handleCreate, isCreating]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isUpdating) {
      handleUpdate();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  }, [handleUpdate, isUpdating]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50" style={{ zIndex: Z_INDEX.modal }}>
      <div className="bg-bg-card rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium text-sm">소분류 관리</h3>
          <Button
            unstyled
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-secondary"
          >
            <X size={18} className="text-text-secondary" />
          </Button>
        </div>

        {/* 안내문구 */}
        <div className="px-4 py-3 bg-accent/5 border-b border-border">
          <p className="text-xs text-text-secondary leading-relaxed">
            소분류는 대분류 내에서 <span className="text-text-primary font-medium">나만의 기준</span>으로
            콘텐츠를 정리할 수 있는 폴더입니다. 장르, 시리즈, 테마 등 자유롭게 만들어 보세요.
          </p>
        </div>

        {/* 새 분류 추가 */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="새 분류 이름"
              className="flex-1 px-3 py-2 text-sm bg-bg-secondary rounded-lg border border-border focus:border-accent focus:outline-none"
              maxLength={50}
            />
            <Button
              unstyled
              onClick={handleCreate}
              disabled={!newCategoryName.trim() || isCreating}
              className="px-3 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isCreating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FolderPlus size={16} />
              )}
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>

        {/* 분류 목록 */}
        <div className="max-h-64 overflow-y-auto">
          {categories.length === 0 ? (
            <div className="py-8 text-center text-text-secondary text-sm">
              아직 분류가 없습니다
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-bg-secondary/50"
                >
                  {editingId === category.id ? (
                    // 편집 모드
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="flex-1 px-2 py-1 text-sm bg-bg-secondary rounded border border-accent focus:outline-none"
                        maxLength={50}
                        autoFocus
                      />
                      <Button
                        unstyled
                        onClick={handleUpdate}
                        disabled={!editingName.trim() || isUpdating}
                        className="p-1.5 rounded hover:bg-accent/10 text-accent disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                      </Button>
                      <Button
                        unstyled
                        onClick={handleCancelEdit}
                        className="p-1.5 rounded hover:bg-bg-secondary text-text-secondary"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    // 보기 모드
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{category.name}</span>
                        <span className="text-xs text-text-secondary">
                          ({category.content_count})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          unstyled
                          onClick={() => handleStartEdit(category)}
                          className="p-1.5 rounded hover:bg-accent/10 text-text-secondary hover:text-accent"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          unstyled
                          onClick={() => handleDelete(category.id)}
                          disabled={deletingId === category.id}
                          className="p-1.5 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-400 disabled:opacity-50"
                        >
                          {deletingId === category.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 하단 안내 */}
        <div className="px-4 py-3 bg-bg-secondary/50 text-xs text-text-secondary">
          분류를 삭제하면 해당 콘텐츠는 미분류로 이동됩니다.
        </div>
      </div>
    </div>
  );
}
