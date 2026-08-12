"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import { getFlowsContainingContent } from "@/actions/flows";
import { removeContent } from "@/actions/contents/removeContent";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

import type { FlowInfo } from "./contentLibraryTypes";

export function useContentLibraryDelete(
  contents: UserContentWithContent[],
  setContents: Dispatch<SetStateAction<UserContentWithContent[]>>,
  reload: () => Promise<void>,
) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; contentId: string } | null>(null);
  const [deleteAffectedFlows, setDeleteAffectedFlows] = useState<FlowInfo[]>([]);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const openDeleteModal = useCallback(async (userContentId: string) => {
    const item = contents.find((content) => content.id === userContentId);
    if (!item) return;
    setDeleteTarget({ id: userContentId, contentId: item.content_id });
    setDeleteAffectedFlows(await getFlowsContainingContent(item.content_id));
  }, [contents]);

  const closeDeleteModal = useCallback(() => {
    setDeleteTarget(null);
    setDeleteAffectedFlows([]);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleteLoading(true);
    setContents((previous) => previous.filter((item) => item.id !== deleteTarget.id));
    try {
      await removeContent(deleteTarget.id);
      closeDeleteModal();
    } catch (deleteError) {
      void reload();
      console.error("삭제 실패:", deleteError);
    } finally {
      setIsDeleteLoading(false);
    }
  }, [closeDeleteModal, deleteTarget, reload, setContents]);

  return {
    openDeleteModal,
    isDeleteModalOpen: deleteTarget !== null,
    deleteAffectedFlows,
    isDeleteLoading,
    closeDeleteModal,
    confirmDelete,
  };
}
