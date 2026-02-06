/*
  콘텐츠 저장 상태 관리 훅
  - 초기 저장 여부 확인 (checkContentSaved)
  - 관심 등록 (addContent)
  - 상태 변경 (updateStatus)
  - 관심 해제 (removeContent)

  ContentCard의 saved/addable 관련 props를 한 번에 반환한다.
*/
"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { addContent } from "@/actions/contents/addContent";
import { updateStatus } from "@/actions/contents/updateStatus";
import { removeContent } from "@/actions/contents/removeContent";
import { checkContentSaved } from "@/actions/contents/getMyContentIds";
import type { ContentType, ContentStatus } from "@/types/database";

interface UseSavedContentParams {
  contentId: string;
  contentType: ContentType;
  title: string;
  creator?: string;
  thumbnailUrl?: string;
  // 초기 저장 여부를 외부에서 주입 (배치 조회 결과 등)
  initialSaved?: boolean;
  // 초기 저장 여부를 자동 조회할지 여부 (기본: true)
  autoCheck?: boolean;
}

interface UseSavedContentReturn {
  isAdded: boolean;
  isChecking: boolean;
  isProcessing: boolean;
  // ContentCard에 바로 전달할 props
  savedProps: {
    saved: boolean;
    onSavedStatusChange?: (status: ContentStatus) => void;
    onSavedRemove?: () => void;
    addable: boolean;
    onAdd: (e: React.MouseEvent) => void;
  };
}

export default function useSavedContent({
  contentId,
  contentType,
  title,
  creator,
  thumbnailUrl,
  initialSaved,
  autoCheck = true,
}: UseSavedContentParams): UseSavedContentReturn {
  const [isAdded, setIsAdded] = useState(initialSaved ?? false);
  const [isChecking, setIsChecking] = useState(initialSaved === undefined && autoCheck);
  const [isPending, startTransition] = useTransition();
  const [userContentId, setUserContentId] = useState<string | null>(null);

  // initialSaved 동기화
  useEffect(() => {
    if (initialSaved !== undefined) setIsAdded(initialSaved);
  }, [initialSaved]);

  // 자동 저장 여부 확인
  useEffect(() => {
    if (initialSaved !== undefined || !autoCheck) return;
    checkContentSaved(contentId).then((result) => {
      setIsAdded(result.saved);
      if (result.saved && result.userContentId) setUserContentId(result.userContentId);
      setIsChecking(false);
    });
  }, [contentId, initialSaved, autoCheck]);

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAdded || isPending) return;
    startTransition(async () => {
      const result = await addContent({
        id: contentId,
        type: contentType,
        title,
        creator,
        thumbnailUrl,
        status: "WANT",
      });
      if (result.success) {
        setIsAdded(true);
        setUserContentId(result.data.userContentId);
      }
    });
  }, [contentId, contentType, title, creator, thumbnailUrl, isAdded, isPending]);

  const handleStatusChange = useCallback((status: ContentStatus) => {
    if (!userContentId) return;
    startTransition(async () => {
      const result = await updateStatus({ userContentId, status });
      if (result.success) setIsAdded(false);
    });
  }, [userContentId]);

  const handleRemove = useCallback(() => {
    if (!userContentId) return;
    startTransition(async () => {
      await removeContent(userContentId);
      setIsAdded(false);
      setUserContentId(null);
    });
  }, [userContentId]);

  return {
    isAdded,
    isChecking,
    isProcessing: isPending,
    savedProps: {
      saved: isAdded,
      onSavedStatusChange: userContentId ? handleStatusChange : undefined,
      onSavedRemove: userContentId ? handleRemove : undefined,
      addable: !isChecking && !isAdded && !isPending,
      onAdd: handleAdd,
    },
  };
}
