/*
  통합 콘텐츠 카드

  슬롯 레이아웃:
    좌상단 - [카테고리 레이블] (항상 표시)
    좌하단 - [인물 구성 숫자 뱃지]
    우상단 - [삭제] OR [선물] OR [북마크]
    우하단 - [별점]
    중앙   - [선택 체크 오버레이]
*/
"use client";

import { useState, useEffect } from "react";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Star, Bookmark, Check, X, Trash2, ThumbsUp } from "lucide-react";
import DropdownMenu, { DropdownMenuItem } from "@/components/ui/DropdownMenu";
import { BLUR_DATA_URL } from "@/constants/image";
import { Z_INDEX } from "@/constants/zIndex";
import { getCategoryByDbType } from "@/constants/categories";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import FormattedText from "@/components/ui/FormattedText";
import { RecommendationModal } from "@/components/features/recommendations";
import { getPresetByKeyword, getSentimentColorClasses } from "@/constants/review-presets";
import ContentReviewModal from "@/components/features/game/shared/ContentReviewModal";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { addContent } from "@/actions/contents/addContent";
import { removeContent } from "@/actions/contents/removeContent";

import { getFieldTheme } from "../certificateThemes";
import type { ContentCardProps } from "./types";
import { getBookEditions } from "@/lib/utils/editions";
import { TYPE_ICONS, ASPECT_STYLES } from "./constants";
import { useContentCounts } from "./hooks/useCelebCount";
import { useEditionThumbnail } from "./hooks/useEditionThumbnail";
import {
  TypeLabel,
  SelectOverlay,
  RecommendButton,
  StatsBadge,
  RatingBadge,
  DeleteButton,
  SavedBadge,
  AddButton,
  EditionToggle,
} from "./slots";
import TypeInfoModal from "./modals/TypeInfoModal";
import ContentStatsModal from "./modals/ContentStatsModal";

const CORNER_SIZE = 16;

const CORNER_RADIUS = {
  lg: { tl: "rounded-tl-lg", tr: "rounded-tr-lg", bl: "rounded-bl-lg", br: "rounded-br-lg" },
  xl: { tl: "rounded-tl-xl", tr: "rounded-tr-xl", bl: "rounded-bl-xl", br: "rounded-br-xl" },
};

const CORNER_COMMON = "drop-shadow-[0_0_3px_rgba(212,175,55,0.6)]";

function CornerAccents({ radius = "xl" }: { radius?: "lg" | "xl" }) {
  const r = CORNER_RADIUS[radius];
  return (
    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-200" style={{ zIndex: Z_INDEX.cardBadge - 1 }}>
      <span className={`absolute top-0 left-0 border-t-[2.5px] border-l-[2.5px] border-accent ${CORNER_COMMON} ${r.tl}`} style={{ width: CORNER_SIZE, height: CORNER_SIZE }} />
      <span className={`absolute top-0 right-0 border-t-[2.5px] border-r-[2.5px] border-accent ${CORNER_COMMON} ${r.tr}`} style={{ width: CORNER_SIZE, height: CORNER_SIZE }} />
      <span className={`absolute bottom-0 left-0 border-b-[2.5px] border-l-[2.5px] border-accent ${CORNER_COMMON} ${r.bl}`} style={{ width: CORNER_SIZE, height: CORNER_SIZE }} />
      <span className={`absolute bottom-0 right-0 border-b-[2.5px] border-r-[2.5px] border-accent ${CORNER_COMMON} ${r.br}`} style={{ width: CORNER_SIZE, height: CORNER_SIZE }} />
    </div>
  );
}

export default function ContentCard({
  thumbnail,
  title,
  creator,
  contentType = "BOOK",
  href,
  onClick,
  aspectRatio = "2/3",
  selectable,
  isSelected = false,
  onSelect,
  topRightNode,
  deletable,
  onDelete,
  recommendable,
  userContentId,
  saved,
  onSavedStatusChange,
  onSavedRemove,
  addable,
  onAdd,
  celebCount,
  userCount,
  onStatsClick,
  rating,
  onRatingClick,
  showInfo = true,
  showGradient = true,
  contentId,
  review,
  reviewPresets,
  isSpoiler = false,
  sourceUrl,
  ownerNickname,
  headerNode,
  className,
  heightClass = "h-[280px]",
  forcePoster = false,
  mobileLayout = "poster",
  modalZIndex,
  titleKo,
  titleEn,
  creatorEn,
  thumbnailEn,
}: ContentCardProps) {
  const ContentIcon = TYPE_ICONS[contentType];
  const aspectClass = ASPECT_STYLES[aspectRatio];
  const locale = useLocale();
  const t = useTranslations("content");

  // 인증 상태 확인
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
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
  }, []);

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
    // 빈 이미지나 깨진 이미지 감지 로직 완화
    const { naturalWidth, naturalHeight } = e.currentTarget;
    // 1px 이하의 픽셀(트래킹 등)이나 로드 실패로 간주될 매우 작은 이미지만 필터링
    if (naturalWidth < 5 || naturalHeight < 5) setImageError(true);
  };

  // 모달 상태
  const [showModal, setShowModal] = useState(false);
  const [isBadgeHovered, setIsBadgeHovered] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [isTypeInfoOpen, setIsTypeInfoOpen] = useState(false);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [showSavedAction, setShowSavedAction] = useState(false);

  // 인원 구성: prop으로 전달되면 사용, 없으면 자동 조회
  const shouldFetch = celebCount === undefined;
  const fetched = useContentCounts(shouldFetch ? contentId : undefined);
  const effectiveCelebCount = celebCount ?? fetched.celebCount;
  const effectiveUserCount = userCount ?? fetched.userCount ?? 0;

  // 에디션 토글 (BOOK 전용 — 내부 자동 계산)
  // thumbnailEn prop이 없으면 contentId로 DB 자동 조회
  const resolvedThumbnailEn = useEditionThumbnail(contentId, contentType, thumbnailEn);
  const editions = contentType === "BOOK"
    ? getBookEditions({ type: "BOOK", title_ko: titleKo, title_en: titleEn, creator, creator_en: creatorEn, thumbnail_url: thumbnail, thumbnail_en: resolvedThumbnailEn })
    : undefined;
  const showEditionToggle = !!editions;
  const [activeEdition, setActiveEdition] = useState<"ko" | "en">(locale === "en" ? "en" : "ko");

  const displayTitle = showEditionToggle && editions![activeEdition]
    ? editions![activeEdition]!.title
    : title;
  const displayCreator = showEditionToggle && editions![activeEdition]
    ? editions![activeEdition]!.creator ?? creator
    : creator;
  const displayThumbnail = showEditionToggle && editions![activeEdition]?.thumbnail
    ? editions![activeEdition]!.thumbnail!
    : thumbnail;

  // 선택한 에디션이 존재하지 않을 때
  const editionUnavailable = showEditionToggle && !editions![activeEdition];

  // 썸네일 변경 시 에러 상태 초기화
  useEffect(() => {
    setImageError(false);
  }, [thumbnail, activeEdition]);

  const showImage = !!displayThumbnail && !imageError;

  // 리뷰 모드 여부: 리뷰 데이터가 있고, 강제 포스터 모드가 아닐 때
  const isReviewMode = (review !== undefined || (reviewPresets && reviewPresets.length > 0) || headerNode !== undefined) && !forcePoster;

  // 리뷰/프리셋 콘텐츠가 있을 때 sourceUrl 필수 검증 (headerNode 모드는 제외)
  useEffect(() => {
    const hasReviewContent = review !== undefined || (reviewPresets && reviewPresets.length > 0);
    if (hasReviewContent && !sourceUrl && !headerNode) {
      console.error('[ContentCard] 리뷰/프리셋이 있는데 sourceUrl이 없습니다:', {
        title,
        contentId,
        userContentId,
        review: review?.substring(0, 50),
        reviewPresets,
      });
    }
  }, [review, reviewPresets, sourceUrl, title, contentId, userContentId, headerNode]);

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
    // 강제 포스터 모드에서도 리뷰가 있으면 모달 오픈
    if (forcePoster && review && !selectable) {
        e.preventDefault();
        setShowModal(true);
        return;
    }
    if (onClick) {
      onClick();
      if (!href) e.preventDefault();
    }
  };

  // 자격증 테마 (thumbnail 폴백용)
  const certTheme = contentType === "CERTIFICATE"
    ? getFieldTheme(title, creator ?? "")
    : null;

  // #region 자격증 폴백 렌더링
  const renderCertificateFallback = (iconSize: number) => {
    if (!certTheme) return null;
    const CertIcon = certTheme.icon;
    return (
      <div className={`w-full h-full bg-gradient-to-br ${certTheme.gradient} overflow-hidden`}>
        <div className="absolute inset-0 opacity-100" style={{ backgroundImage: `url("${certTheme.pattern}")` }} />
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-black/10 rounded-full blur-lg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-150" />
            <div className="relative w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
              <CertIcon size={iconSize} className="text-white drop-shadow-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // #endregion

  // #region 슬롯 렌더링
  const renderTopLeft = () => (
    <TypeLabel type={contentType} onOpen={() => setIsTypeInfoOpen(true)} />
  );

  const renderSelectOverlay = () => {
    if (!selectable) return null;
    return <SelectOverlay isSelected={isSelected} />;
  };

  const renderTopRight = () => {
    if (topRightNode) {
      return (
        <div
          className="absolute top-1 right-1"
          style={{ zIndex: Z_INDEX.cardBadge }}
          onClick={(e) => e.stopPropagation()}
        >
          {topRightNode}
        </div>
      );
    }

    // 인증 확인 중이거나 비로그인: 액션 버튼 숨김
    if (isCheckingAuth || !user) {
      return null;
    }

    // 로그인 상태: 액션 메뉴 아이템 구성
    const menuItems: DropdownMenuItem[] = [];

    // 서재에 있음: 추천 | 삭제
    if (internalSaved) {
      // 추천 (recommendable이 false가 아니면 기본 표시)
      if (recommendable !== false) {
        menuItems.push({
          label: "추천",
          icon: <ThumbsUp size={14} />,
          onClick: () => setIsRecommendModalOpen(true),
        });
      }

      // 삭제 (deletable이 false가 아니면 기본 표시)
      if (deletable !== false) {
        menuItems.push({
          label: "삭제",
          icon: <Trash2 size={14} />,
          onClick: async () => {
            if (onDelete) {
              onDelete({ stopPropagation: () => {}, preventDefault: () => {} } as any);
            } else if (internalUserContentId) {
              // 내부에서 직접 삭제
              await removeContent(internalUserContentId);
              setInternalSaved(false);
              setInternalUserContentId(undefined);
            }
          },
          variant: "danger",
        });
      }
    }
    // 서재에 없음: 담기 (기본 표시)
    else {
      menuItems.push({
        label: "서재에 담기",
        icon: <Bookmark size={14} />,
        onClick: () => {
          if (onAdd) {
            onAdd({ stopPropagation: () => {}, preventDefault: () => {} } as any);
          } else {
            setShowAddConfirm(true);
          }
        },
      });
    }

    // 로그인 상태면 항상 메뉴 표시
    return (
      <div
        className="absolute top-1 right-1"
        style={{ zIndex: Z_INDEX.cardBadge }}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu
          items={menuItems}
          buttonClassName="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-md border border-white/10 shadow-lg hover:bg-black/80 hover:border-white/30 text-white/90"
          iconSize={14}
        />
      </div>
    );
  };

  // 좌하단: 인원 구성 뱃지 (셀럽 | 일반인)
  const renderBottomLeft = () => {
    // 아직 로딩 중이면 미표시 (0이어도 표시)
    if (effectiveCelebCount === undefined) return null;

    const handleStatsClick = onStatsClick || ((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowStatsModal(true);
    });

    return (
      <div
        onMouseEnter={() => setIsBadgeHovered(true)}
        onMouseLeave={() => setIsBadgeHovered(false)}
      >
        <StatsBadge celebCount={effectiveCelebCount} userCount={effectiveUserCount} onClick={handleStatsClick} />
      </div>
    );
  };

  const renderBottomRight = () => {
    // onRatingClick이 있으면 rating이 null이어도 표시 (클릭해서 등록 가능)
    if (rating || onRatingClick) {
      return <RatingBadge rating={rating ?? null} onClick={onRatingClick} />;
    }
    return null;
  };

  // 중상단 슬롯: 에디션 토글 (포스터 위 오버레이)
  const renderMidTop = () => {
    if (!showEditionToggle) return null;
    return (
      <div
        className="absolute left-1/2 -translate-x-1/2 top-1"
        style={{ zIndex: Z_INDEX.cardBadge }}
        onClick={(e) => e.stopPropagation()}
      >
        <EditionToggle editions={editions!} activeEdition={activeEdition} onToggle={setActiveEdition} />
      </div>
    );
  };
  // #endregion

  // 선택 모드 스타일
  const selectableClass = selectable
    ? isSelected
      ? "ring-2 ring-accent"
      : "hover:ring-1 hover:ring-border"
    : "";

  // 공통 모달 (모든 모드에서 동일하게 렌더링)
  const ReviewModal = (
    <ContentReviewModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      title={displayTitle}
      creator={displayCreator}
      review={review}
      reviewPresets={reviewPresets}
      isSpoiler={isSpoiler}
      sourceUrl={sourceUrl}
      ownerNickname={ownerNickname}
      contentDetailUrl={contentDetailUrl}
      zIndex={modalZIndex}
    />
  );

  const modals = (
    <>
      <TypeInfoModal
        isOpen={isTypeInfoOpen}
        onClose={() => setIsTypeInfoOpen(false)}
        currentType={contentType}
      />
      <ContentStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        contentId={contentId || ""}
        contentTitle={title}
        contentThumbnail={thumbnail}
        celebCount={effectiveCelebCount ?? 0}
      />
      {internalSaved && internalUserContentId && (
        <RecommendationModal
          isOpen={isRecommendModalOpen}
          onClose={() => setIsRecommendModalOpen(false)}
          userContentId={internalUserContentId}
          contentTitle={title}
          contentThumbnail={thumbnail ?? null}
          contentType={contentType}
        />
      )}
      <Modal isOpen={showAddConfirm} onClose={() => setShowAddConfirm(false)} title="서재에 담기" icon={Bookmark} size="sm" closeOnOverlayClick zIndex={modalZIndex}>
        <ModalBody>
          <p className="text-text-secondary">
            <span className="text-text-primary font-semibold">{title}</span>
            을(를) 서재에 담으시겠습니까?
          </p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => setShowAddConfirm(false)}>취소</Button>
          <Button variant="primary" size="md" onClick={async (e) => {
            setShowAddConfirm(false);
            if (onAdd) {
              onAdd(e as React.MouseEvent);
            } else {
              // 내부에서 직접 추가
              if (!contentId) {
                console.error('[ContentCard] contentId 없음');
                return;
              }

              try {
                const result = await addContent({
                  id: contentId,
                  type: contentType,
                  title,
                  creator: creator ?? undefined,
                  thumbnailUrl: thumbnail ?? undefined,
                  status: "WANT",
                });

                console.log('[ContentCard] addContent 결과:', result);

                if (result.success && result.data) {
                  setInternalSaved(true);
                  setInternalUserContentId(result.data.userContentId);
                  console.log('[ContentCard] 서재 추가 완료:', result.data.userContentId);
                } else {
                  console.error('[ContentCard] addContent 실패:', result);
                }
              } catch (error) {
                console.error('[ContentCard] addContent 에러:', error);
              }
            }
          }}>등록</Button>
        </ModalFooter>
      </Modal>
      <Modal isOpen={showSavedAction} onClose={() => setShowSavedAction(false)} title="서재 관리" icon={Bookmark} size="sm" closeOnOverlayClick zIndex={modalZIndex}>
        <ModalBody>
          <p className="text-sm text-text-secondary mb-4">
            <span className="text-text-primary font-semibold">{title}</span>
          </p>
          <div className="flex flex-col gap-2">
            {onSavedStatusChange && (
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-start gap-2"
                onClick={() => { setShowSavedAction(false); onSavedStatusChange("FINISHED"); }}
              >
                <Check size={16} className="text-green-400" />
                감상완료로 변경
              </Button>
            )}
            {onSavedRemove && (
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-start gap-2 text-red-400 hover:text-red-300"
                onClick={() => { setShowSavedAction(false); onSavedRemove(); }}
              >
                <X size={16} />
                기록 삭제
              </Button>
            )}
          </div>
        </ModalBody>
      </Modal>
      {ReviewModal}
    </>
  );

  // #region 리뷰 모드 렌더링
  if (isReviewMode) {
    const isMobileReview = mobileLayout === "review";
    // PC/Mobile Horizontal Layout Visibility
    // if review mode on mobile is enabled, always show horizontal layout.
    // otherwise, show horizontal only on sm+
    const horizontalVisibility = isMobileReview ? "flex" : "hidden sm:flex";
    
    // Mobile Vertical (Poster) Layout Visibility
    // if review mode on mobile is enabled, hide vertical layout.
    // otherwise, show vertical only on mobile (below sm)
    const verticalVisibility = isMobileReview ? "hidden" : "sm:hidden flex";

    return (
      <>
        {/* 가로 레이아웃 (PC 기본, 모바일 옵션) - 썸네일/리뷰 나란히 배치 */}
        <div className={`relative group/card ${horizontalVisibility} ${className || ""}`}>
          <CornerAccents radius="lg" />
          <div
            onClick={handleClick}
            className="flex items-stretch gap-3 cursor-pointer w-full"
          >
          {/* 썸네일 영역 */}
          <div className={`relative ${isMobileReview ? "w-28 sm:w-40" : "w-40"} flex-shrink-0 rounded-lg overflow-hidden bg-bg-secondary shadow-lg border border-white/5 ${heightClass}`}>
            {renderTopLeft()}
            {renderTopRight()}
            {renderMidTop()}
            {showImage ? (
              <Image
                src={displayThumbnail!}
                alt={title}
                fill
                sizes="160px"
                className="object-cover transition-transform duration-300 delay-150 group-hover:scale-105"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                onError={() => setImageError(true)}
                onLoad={handleImageLoad}
                unoptimized
                loading="lazy"
              />
            ) : certTheme ? (
              renderCertificateFallback(32)
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <ContentIcon size={48} className="text-text-tertiary" />
              </div>
            )}
            {renderBottomLeft()}
            {renderSelectOverlay()}
            {renderBottomRight()}
          </div>

          {/* 리뷰 영역 */}
          <div className={`flex-1 min-w-0 flex flex-col ${heightClass} bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden p-3 sm:p-4`}>
            {headerNode && (
              <div className="mb-2 pb-2 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
                {headerNode}
              </div>
            )}

            <div className="mb-2">
              <h3 className="text-xs sm:text-sm font-bold text-text-primary line-clamp-2 leading-tight group-hover:text-accent">
                {displayTitle}
              </h3>
              {displayCreator && (
                <p className="text-[10px] sm:text-xs text-text-secondary line-clamp-1 mt-1">
                  {displayCreator.replace(/\^/g, ", ")}
                </p>
              )}
            </div>

            {!headerNode && rating && (
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1 text-xs text-text-primary font-medium">
                  <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  {rating.toFixed(1)}
                </span>
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-0">
              {editionUnavailable ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-text-tertiary/70 italic">
                    {activeEdition === "ko" ? t("edition.noKoDesc") : t("edition.noEnDesc")}
                  </p>
                </div>
              ) : (
              <>
              {/* 프리셋 먼저 표시 */}
              {reviewPresets && reviewPresets.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2 px-0.5">
                  {reviewPresets.map((presetKeyword, idx) => {
                    const preset = getPresetByKeyword(presetKeyword);
                    const sentiment = preset?.sentiment || "etc";
                    const colorClasses = getSentimentColorClasses(sentiment);
                    return (
                      <span
                        key={`${presetKeyword}-${idx}`}
                        className={`px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-medium whitespace-nowrap ${colorClasses}`}
                      >
                        {presetKeyword}
                      </span>
                    );
                  })}
                </div>
              )}

              {(review && !isSpoiler) && (
                <div className="flex-1 relative min-h-0 overflow-hidden">
                  <p className="text-[11px] sm:text-xs md:text-sm text-text-secondary leading-relaxed whitespace-pre-line break-words font-sans line-clamp-[8]">
                    <FormattedText text={review} />
                  </p>
                  <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none" />
                </div>
              )}

              {review && isSpoiler && (
                <div className="flex-1 flex items-center justify-center bg-white/5 rounded border border-white/5">
                  <p className="text-sm text-text-tertiary">스포일러 포함</p>
                </div>
              )}

              {!review && (!reviewPresets || reviewPresets.length === 0) && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-text-tertiary/50 italic">리뷰 없음</p>
                </div>
              )}
              </>
              )}

              {/* 출처 링크 (필수) */}
              <div className="mt-2 text-xs truncate">
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-accent/60 hover:text-accent underline underline-offset-2"
                  >
                    출처: {sourceUrl}
                  </a>
                ) : (
                  <span className="text-red-500 font-semibold">
                    ⚠️ 출처 URL 누락
                  </span>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* 모바일: 포스터 카드 (mobileLayout='review'일 때 숨김) */}
        <div
          className={`${verticalVisibility} flex-col ${headerNode ? "bg-[#1e1e1e] border border-white/10 rounded-lg overflow-hidden shadow-md" : "space-y-2"} ${className || ""}`}
        >
          {headerNode && (
            <div className="px-2.5 py-2 flex justify-between items-start bg-black/20 border-b border-white/5" onClick={(e) => e.stopPropagation()}>
              <div className="flex-1">{headerNode}</div>
            </div>
          )}

          <div
            onClick={handleClick}
            className={`cursor-pointer relative ${headerNode ? "overflow-hidden bg-bg-secondary" : "bg-[#212121] border border-border/60 rounded-lg overflow-hidden active:border-accent/50"}`}
          >
            {renderTopLeft()}
            {renderTopRight()}

            <div className={`${aspectClass} overflow-hidden relative bg-bg-secondary`}>
              {showImage ? (
                <Image
                  src={displayThumbnail!}
                  alt={title}
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  onError={() => setImageError(true)}
                  onLoad={handleImageLoad}
                  unoptimized
                  loading="lazy"
                />
              ) : certTheme ? (
                renderCertificateFallback(32)
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <ContentIcon size={32} className="text-text-tertiary" />
                </div>
              )}
              {renderMidTop()}
              {renderBottomLeft()}
              {renderSelectOverlay()}
              {renderBottomRight()}

            </div>

            <div className={`p-2 ${headerNode ? "bg-[#151515]" : ""}`}>
              <h3 className="text-[11px] font-bold text-text-primary line-clamp-2 leading-tight min-h-[28px]">
                {displayTitle}
              </h3>
              <p className="text-[10px] text-text-secondary line-clamp-1 mt-1">
                {displayCreator ? displayCreator.replace(/\^/g, ", ") : "\u00A0"}
              </p>
            </div>
          </div>
        </div>

        {modals}
      </>
    );
  }
  // #endregion

  // #region 기본 카드 렌더링
  const cardContent = (
    <>
      <div className={`relative ${aspectClass} overflow-hidden bg-bg-secondary`}>
        {showImage ? (
          <Image
            src={displayThumbnail!}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={`object-cover transition-transform duration-300 delay-150 ${selectable && isSelected ? "brightness-90" : !isBadgeHovered ? "group-hover:scale-105" : ""}`}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            onError={() => setImageError(true)}
            onLoad={handleImageLoad}
            unoptimized
            loading="lazy"
          />
        ) : certTheme ? (
          renderCertificateFallback(32)
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <ContentIcon size={32} className="text-text-tertiary" />
          </div>
        )}

        {showGradient && !certTheme && (
          <div className="absolute inset-x-0 bottom-0 h-16 md:h-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        )}

        {renderTopLeft()}
        {renderTopRight()}
        {renderMidTop()}
        {renderBottomLeft()}
        {renderSelectOverlay()}
        {renderBottomRight()}

      </div>

      {showInfo && (
        <div className="p-2 md:p-2.5 bg-black/20 border-t border-white/[0.04]">
          <h3 className={`text-xs md:text-sm font-semibold text-text-primary line-clamp-2 leading-tight min-h-[30px] md:min-h-[35px] ${!isBadgeHovered ? "group-hover:text-accent" : ""}`}>
            {displayTitle}
          </h3>
          <p className="text-[10px] md:text-xs text-text-secondary line-clamp-1 mt-0.5 md:mt-1">
            {displayCreator ? displayCreator.replace(/\^/g, ", ") : "\u00A0"}
          </p>
        </div>
      )}
    </>
  );

  const containerClass = `group relative flex flex-col bg-bg-card border border-white/[0.06] rounded-xl overflow-hidden cursor-pointer ${selectableClass} ${className || ""}`;

  if (href && !selectable) {
    return (
      <div className="relative group/card">
        <CornerAccents />
        <Link href={href} className={containerClass} onClick={handleClick}>
          {cardContent}
        </Link>
        {modals}
      </div>
    );
  }

  return (
    <div className="relative group">
      <CornerAccents />
      <div className={containerClass} onClick={handleClick}>
        {cardContent}
      </div>
      {modals}
    </div>
  );
  // #endregion
}
