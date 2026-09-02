"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/types/locale";
import { createClient } from "@/lib/db/client";
import type { User } from "@supabase/supabase-js";
import { getCategoryByDbType } from "@/constants/categories";
import { getBookEditions } from "@/lib/utils/editions";

import type { ContentCardProps } from "./types";
import { TYPE_ICONS, ASPECT_STYLES } from "./constants";
import { useContentCounts } from "./hooks/useCelebCount";
import { useEditionThumbnail } from "./hooks/useEditionThumbnail";
import { hasReviewContent } from "./reviewContent";

export function useContentCardState(props: ContentCardProps) {
  const {
    thumbnail,
    title,
    creator,
    contentType = "BOOK",
    href,
    aspectRatio = "2/3",
    selectable,
    isSelected = false,
    onSelect,
    saved,
    userContentId,
    celebCount,
    userCount,
    contentId,
    review,
    reviewEn,
    reviewPresets,
    isSpoiler = false,
    sourceUrl,
    headerNode,
    forcePoster = false,
    titleKo,
    titleEn,
    creatorEn,
    thumbnailEn,
    hasEnEdition,
    onClick,
    showInfo = true,
    showGradient = true,
    effectsEnabled = true,
  } = props;

  const ContentIcon = TYPE_ICONS[contentType];
  const aspectClass = ASPECT_STYLES[aspectRatio];
  const locale = useLocale();
  const t = useTranslations("content");

  // 인증 상태 확인
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    if (!effectsEnabled) return;
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const db = createClient();
        const { data: { user } } = await db.auth.getUser();
        if (!cancelled) {
          setUser(user);
          setIsCheckingAuth(false);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!cancelled) setIsCheckingAuth(false);
      }
    };
    checkAuth();
    return () => { cancelled = true; };
  }, [effectsEnabled]);

  // 내부 saved 상태 관리 (props 기본값 + 동적 업데이트)
  const [internalSaved, setInternalSaved] = useState(saved);
  const [internalUserContentId, setInternalUserContentId] = useState(userContentId);

  // props 변경 시 동기화
  useEffect(() => {
    setInternalSaved(saved);
  }, [saved]);

  useEffect(() => {
    setInternalUserContentId(userContentId);
  }, [userContentId]);

  // 이미지 로드 실패 또는 플레이스홀더 감지 시 폴백
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth < 5 || naturalHeight < 5) setImageError(true);
  };

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [isTypeInfoOpen, setIsTypeInfoOpen] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showSavedAction, setShowSavedAction] = useState(false);

  // 인원 구성: prop으로 전달되면 사용, 없으면 자동 조회
  const shouldFetch = celebCount === undefined;
  const fetched = useContentCounts(effectsEnabled && shouldFetch ? contentId : undefined);
  const effectiveCelebCount = celebCount ?? fetched.celebCount;
  const effectiveUserCount = userCount ?? fetched.userCount ?? 0;

  // 에디션 토글 (BOOK 전용 — 내부 자동 계산)
  const resolvedThumbnailEn = useEditionThumbnail(
    effectsEnabled ? contentId : undefined,
    contentType,
    thumbnailEn,
  );
  const editions = contentType === "BOOK"
    ? getBookEditions({ type: "BOOK", title_ko: titleKo, title_en: titleEn, creator, creator_en: creatorEn, thumbnail_url: thumbnail, thumbnail_en: resolvedThumbnailEn, has_en_edition: hasEnEdition })
    : undefined;
  const showEditionToggle = !!editions && (!!editions.ko || !!editions.en || !!editions.confirmedNoEn);
  const [activeEdition, setActiveEdition] = useState<Locale>(locale === "en" ? "en" : "ko");

  const displayTitle = showEditionToggle && editions![activeEdition]
    ? editions![activeEdition]!.title
    : title;
  const displayCreator = showEditionToggle && editions![activeEdition]
    ? editions![activeEdition]!.creator ?? creator
    : creator;
  const displayThumbnail = showEditionToggle && editions![activeEdition]
    ? editions![activeEdition]!.thumbnail ?? null
    : thumbnail;

  // 에디션 토글 시 리뷰(설명)도 전환
  const displayReview = showEditionToggle && activeEdition === "en" && reviewEn
    ? reviewEn
    : review;

  // 선택한 에디션이 존재하지 않을 때
  const editionUnavailable = showEditionToggle && !editions![activeEdition];
  // 에디션은 있지만 표지가 없을 때
  const editionNoCover = showEditionToggle && !!editions![activeEdition] && !editions![activeEdition]!.thumbnail;

  // 썸네일 변경 시 에러 상태 초기화
  useEffect(() => {
    setImageError(false);
  }, [thumbnail, activeEdition]);

  const showImage = effectsEnabled && !!displayThumbnail && !imageError;

  // 리뷰 모드 여부
  const isReviewMode = (review !== undefined || (reviewPresets && reviewPresets.length > 0) || headerNode !== undefined) && !forcePoster;

  // 감상 내용이 실린 카드에만 출처를 요구한다 (headerNode 모드에서는 제외)
  useEffect(() => {
    if (!effectsEnabled) return;
    if (hasReviewContent(review, reviewPresets) && !sourceUrl && !headerNode) {
      console.error('[ContentCard] 리뷰/프리셋이 있는데 sourceUrl이 없습니다:', {
        title,
        contentId,
        userContentId,
        review: review?.substring(0, 50),
        reviewPresets,
      });
    }
  }, [contentId, effectsEnabled, headerNode, review, reviewPresets, sourceUrl, title, userContentId]);

  // 콘텐츠 상세 페이지 URL
  const contentDetailUrl = contentId
    ? `/content/${contentId}?category=${getCategoryByDbType(contentType)?.id || "book"}`
    : href;

  // 클릭 핸들러
  const handleClick = (e: React.MouseEvent) => {
    if (selectable && onSelect) {
      e.preventDefault();
      onSelect();
      return;
    }
    if (isReviewMode) {
      e.preventDefault();
      setShowModal(true);
      return;
    }
    if (forcePoster && displayReview && !selectable) {
        e.preventDefault();
        setShowModal(true);
        return;
    }
    if (onClick) {
      onClick();
      if (!href) e.preventDefault();
    }
  };

  // 선택 모드 스타일
  const selectableClass = selectable
    ? isSelected
      ? "ring-2 ring-accent"
      : "hover:ring-1 hover:ring-border"
    : "";

  return {
    // resolved props with defaults
    contentType: contentType as NonNullable<ContentCardProps["contentType"]>,
    aspectRatio,
    isSelected,
    isSpoiler,
    showInfo,
    showGradient,
    forcePoster,

    // derived
    ContentIcon,
    aspectClass,
    t,
    user,
    isCheckingAuth,
    internalSaved,
    setInternalSaved,
    internalUserContentId,
    setInternalUserContentId,
    imageError,
    setImageError,
    handleImageLoad,
    showModal,
    setShowModal,
    isBadgeHovered,
    setIsBadgeHovered,
    showStatsModal,
    setShowStatsModal,
    showIntroModal,
    setShowIntroModal,
    isRecommendModalOpen,
    setIsRecommendModalOpen,
    isTypeInfoOpen,
    setIsTypeInfoOpen,
    showAddConfirm,
    setShowAddConfirm,
    showSavedAction,
    setShowSavedAction,
    effectiveCelebCount,
    effectiveUserCount,
    editions,
    showEditionToggle,
    activeEdition,
    setActiveEdition,
    displayTitle,
    displayCreator,
    displayThumbnail,
    displayReview,
    editionUnavailable,
    editionNoCover,
    showImage,
    isReviewMode,
    contentDetailUrl,
    handleClick,
    selectableClass,
  };
}

export type ContentCardState = ReturnType<typeof useContentCardState>;
