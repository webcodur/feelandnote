/*
  통합 콘텐츠 카드

  슬롯 레이아웃:
    헤더 바 - [좌: 카테고리] [중: 에디션 토글] [우: 액션 버튼]
    포스터 위:
      좌하단 - [인물 구성 숫자 뱃지]
      우하단 - [별점]
      중앙   - [선택 체크 오버레이]
*/
"use client";

import type { ContentCardProps } from "./types";
import { useContentCardState } from "./useContentCardState";
import ReviewLayout from "./sections/ReviewLayout";
import DefaultLayout from "./sections/DefaultLayout";

export default function ContentCard(props: ContentCardProps) {
  const state = useContentCardState(props);

  if (state.isReviewMode) {
    return <ReviewLayout props={props} state={state} />;
  }

  return <DefaultLayout props={props} state={state} />;
}
