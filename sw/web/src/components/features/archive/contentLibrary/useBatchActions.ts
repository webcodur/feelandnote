"use client";

import { useState } from "react";
import { batchRemoveContents } from "@/actions/contents";
import { moveToCategory } from "@/actions/categories/moveToCategory";

interface UseBatchActionsOptions {
  selectedIds: Set<string>;
  toggleBatchMode: () => void;
  loadContents: () => void;
  loadCategories: () => void;
}

export function useBatchActions({ selectedIds, toggleBatchMode, loadContents, loadCategories }: UseBatchActionsOptions) {
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${selectedIds.size}개 콘텐츠를 삭제하시겠습니까?`)) return;

    setIsBatchLoading(true);
    try {
      await batchRemoveContents({ userContentIds: [...selectedIds] });
      toggleBatchMode();
      loadContents();
    } catch (err) {
      console.error("일괄 삭제 실패:", err);
      alert("일괄 삭제에 실패했습니다.");
    } finally {
      setIsBatchLoading(false);
    }
  };

  const handleBatchCategoryChange = async (categoryId: string | null) => {
    if (selectedIds.size === 0) return;

    setIsBatchLoading(true);
    try {
      await moveToCategory({ userContentIds: [...selectedIds], categoryId });
      toggleBatchMode();
      loadContents();
      loadCategories();
    } catch (err) {
      console.error("일괄 분류 이동 실패:", err);
      alert("일괄 분류 이동에 실패했습니다.");
    } finally {
      setIsBatchLoading(false);
    }
  };

  return { isBatchLoading, handleBatchDelete, handleBatchCategoryChange };
}
