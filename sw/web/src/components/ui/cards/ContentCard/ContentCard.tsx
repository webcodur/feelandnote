/*
  통합 콘텐츠 카드

  슬롯 레이아웃:
    헤더 바 - [좌: 카테고리] [중: 에디션 토글] [우: 액션 버튼]
    포스터 위:
      좌하단 - [인물 구성 숫자 뱃지]
      우하단 - [작품 소개]
      중앙   - [선택 체크 오버레이]
*/
"use client";

import type { ContentCardProps } from "./types";
import { useContentCardState } from "./useContentCardState";
import StackedReviewLayout from "./sections/StackedReviewLayout";
import ReviewLayout from "./sections/ReviewLayout";
import DefaultLayout from "./sections/DefaultLayout";
import { ContentCardDisplayContext } from "./ContentCardDisplayContext";

export default function ContentCard(props: ContentCardProps) {
  const state = useContentCardState(props);

  return <ContentCardDisplayContext.Provider value={{
    contentId: props.contentId, title: state.displayTitle, creator: state.displayCreator,
    thumbnail: state.displayThumbnail,
    bookLocale: state.contentType === "BOOK" ? state.showEditionToggle ? state.activeEdition : props.bookLocale : undefined,
    available: !state.editionUnavailable,
  }}>
    {state.isReviewMode
      ? props.reviewLayout === "stacked" ? <StackedReviewLayout props={props} state={state} /> : <ReviewLayout props={props} state={state} />
      : <DefaultLayout props={props} state={state} />}
  </ContentCardDisplayContext.Provider>;
}
