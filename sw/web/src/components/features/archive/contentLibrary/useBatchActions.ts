"use client";

import { useState } from "react";
import { batchRemoveContents } from "@/actions/contents";
import { moveToCategory } from "@/actions/categories/moveToCategory";
import { getPlaylistsContainingContents } from "@/actions/playlists";

interface PlaylistInfo {
  id: string;
  name: string;
}

interface UseBatchActionsOptions {
  selectedIds: Set<string>;
  contentIdMap: Map<string, string>; // userContentId -> contentId 매핑
  toggleBatchMode: () => void;
  loadContents: () => void;
  loadCategories: () => void;
}

export function useBatchActions({ selectedIds, contentIdMap, toggleBatchMode, loadContents, loadCategories }: UseBatchActionsOptions) {
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [affectedPlaylists, setAffectedPlaylists] = useState<PlaylistInfo[]>([]);

  // 삭제 모달 열기 (영향받는 재생목록 조회)
  const openDeleteModal = async () => {
    if (selectedIds.size === 0) return;

    const contentIds = [...selectedIds]
      .map(id => contentIdMap.get(id))
      .filter((id): id is string => !!id);

    if (contentIds.length > 0) {
      const playlists = await getPlaylistsContainingContents(contentIds);
      setAffectedPlaylists(playlists);
    } else {
      setAffectedPlaylists([]);
    }

    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setAffectedPlaylists([]);
  };

  // 실제 삭제 실행
  const confirmDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsBatchLoading(true);
    try {
      await batchRemoveContents({ userContentIds: [...selectedIds] });
      closeDeleteModal();
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

  return {
    isBatchLoading,
    isDeleteModalOpen,
    affectedPlaylists,
    openDeleteModal,
    closeDeleteModal,
    confirmDelete,
    handleBatchCategoryChange,
  };
}
