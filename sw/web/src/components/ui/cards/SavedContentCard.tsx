/*
  saved 로직 내장 ContentCard 래퍼
  - checkContentSaved로 초기 저장 상태 자동 확인
  - 관심 등록 / 감상완료 전환 / 관심 해제를 자체 처리
  - 외부에서 saved/addable/onAdd/onSavedStatusChange/onSavedRemove 전달 불필요
*/
"use client";

import useSavedContent from "@/hooks/useSavedContent";
import ContentCard from "./ContentCard";
import type { ContentCardProps } from "./ContentCard/types";

// saved 관련 props는 내부에서 자동 관리하므로 외부 전달 불필요
type SavedManagedProps = "saved" | "addable" | "onAdd" | "onSavedStatusChange" | "onSavedRemove";

interface SavedContentCardProps extends Omit<ContentCardProps, SavedManagedProps> {
  // 외부에서 초기 저장 여부를 주입 (배치 조회 결과 등)
  initialSaved?: boolean;
  // 초기 저장 여부를 자동 조회할지 (기본: true)
  autoCheck?: boolean;
}

export default function SavedContentCard({
  initialSaved,
  autoCheck = true,
  ...cardProps
}: SavedContentCardProps) {
  const { savedProps } = useSavedContent({
    contentId: cardProps.contentId,
    contentType: cardProps.contentType ?? "BOOK",
    title: cardProps.title,
    creator: cardProps.creator ?? undefined,
    thumbnailUrl: cardProps.thumbnail ?? undefined,
    initialSaved,
    autoCheck,
  });

  return <ContentCard {...cardProps} {...savedProps} />;
}
