"use client";

import { useCallback, useMemo } from "react";
import type { UserContentPublic } from "@/actions/contents/getUserContents";
import { mapPublicToUserContent } from "@/components/features/user/contentLibrary/contentLibraryTypes";
import ExpandCard from "@/components/features/user/contentLibrary/expand/ExpandCard";
import { useContentBrief } from "@/components/features/user/contentLibrary/expand/useContentBrief";
import { useCelebContentRecord } from "@/components/features/user/contentLibrary/expand/useCelebContentRecord";
import { useHeldHeight } from "@/components/features/user/contentLibrary/expand/useHeldHeight";

interface Props {
  record: UserContentPublic;
  celebId: string;
  ownerNickname?: string;
  contentIds: string[];
  selectedIndex: number;
}

/** 책장 감상 분류도 인물 상세의 작품 소개·감상배경·전문 모달을 그대로 쓴다. */
export default function BookShelfReviewDetail({ record, celebId, ownerNickname, contentIds, selectedIndex }: Props) {
  const placeholder = useMemo(() => mapPublicToUserContent([record], celebId)[0], [record, celebId]);
  const isActiveContent = useCallback((id: string) => id === record.content_id, [record.content_id]);
  const brief = useContentBrief(contentIds, selectedIndex, record.content_id, isActiveContent, true, undefined, true);
  // 명부의 감상 미리보기를 전문으로 오인하지 않고 상세 리뷰와 같은 공개 전문 조회를 쓴다.
  const nextContentId = contentIds.length > 1 ? contentIds[(selectedIndex + 1) % contentIds.length] : undefined;
  const review = useCelebContentRecord(celebId, record.content_id, undefined, true, nextContentId);
  const cardRef = useHeldHeight(brief.isLoading || review.isLoading);
  return (
    <div ref={cardRef} data-bookshelf-review data-content-id={record.content_id}
      aria-busy={brief.isLoading || review.isLoading}
      className="md:[--reading-preview-max-height:min(28rem,55svh)] md:[--reading-preview-max-width:72ch] [&>article]:rounded-none [&>article]:border-0">
      <ExpandCard
        key={record.content_id}
        item={review.record?.content_id === record.content_id ? review.record : placeholder}
        brief={brief.contentId === record.content_id ? brief.brief : null}
        isBriefLoading={brief.isLoading}
        isRecordLoading={review.isLoading}
        hasBriefError={brief.hasError}
        hasRecordError={review.hasError}
        onRetryBrief={brief.retry}
        onRetryRecord={review.retry}
        isActive
        ownerNickname={ownerNickname}
      />
    </div>
  );
}
