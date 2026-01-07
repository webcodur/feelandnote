/*
  파일명: /components/features/cards/ContentCard.tsx
  기능: 콘텐츠 카드 컴포넌트 (도서, 영상, 게임, 음악)
  책임: 콘텐츠 정보를 카드 형태로 표시하고 상태/진행도 변경을 처리한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Trash2, Eye, CheckSquare, Square, Pin } from "lucide-react";
import type { CategoryWithCount } from "@/types/database";

import ProgressModal from "./ProgressModal";
import DateEditModal from "./DateEditModal";
import ContentDetailModal from "./ContentDetailModal";
import RecordInfoPanel from "@/components/features/archive/RecordInfoPanel";
import Button from "@/components/ui/Button";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
export interface ContentCardProps {
  item: UserContentWithContent;
  categories?: CategoryWithCount[];
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WANT" | "WATCHING" | "FINISHED") => void;
  onRecommendChange?: (userContentId: string, isRecommended: boolean) => void;
  onDateChange?: (userContentId: string, field: "created_at" | "completed_at", date: string) => void;
  onCategoryChange?: (userContentId: string, categoryId: string | null) => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
  // 배치 모드
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  // 핀 모드
  isPinMode?: boolean;
  onPinToggle?: (userContentId: string) => void;
}
// #endregion


export default function ContentCard({
  item,
  categories = [],
  onProgressChange,
  onStatusChange,
  onRecommendChange,
  onDateChange,
  onCategoryChange,
  onDelete,
  href,
  isBatchMode = false,
  isSelected = false,
  onToggleSelect,
  isPinMode = false,
  onPinToggle,
}: ContentCardProps) {
  // #region 훅
  const router = useRouter();
  // #endregion

  // #region 상태
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isViewingDetail, setIsViewingDetail] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(false);
  // #endregion

  // #region 파생 값
  const content = item.content;
  const progressPercent = item.progress ?? 0;
  const isComplete = item.status === "FINISHED" || item.status === "FINISHED";
  const isRecommended = item.is_recommended ?? false;
  const isPinned = item.is_pinned ?? false;
  const canToggleStatus = progressPercent === 0 && !!onStatusChange && !isComplete;
  const canToggleRecommend = isComplete && !!onRecommendChange;
  const canToggle = canToggleStatus || canToggleRecommend;
  // #endregion

  // #region 핸들러
  const handleClick = () => {
    // 핀 모드 우선
    if (isPinMode && onPinToggle) {
      onPinToggle(item.id);
      return;
    }
    if (isBatchMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    if (href) router.push(href);
  };

  const handleProgressChange = (value: number) => {
    onProgressChange?.(item.id, value);
    setIsEditingProgress(false);
  };

  const handleStatusClick = () => {
    if (canToggleStatus && onStatusChange) {
      onStatusChange(item.id, item.status === "WANT" ? "WATCHING" : "WANT");
    } else if (canToggleRecommend && onRecommendChange) {
      onRecommendChange(item.id, !isRecommended);
    }
  };

  const handleCategoryChange = (categoryId: string | null) => {
    onCategoryChange?.(item.id, categoryId);
  };
  // #endregion

  // #region 렌더링
  return (
    <>
      <div
        className={`relative flex flex-row h-[200px] bg-surface/30 border rounded-2xl p-2.5 gap-3 ${
          isSelected ? "border-accent ring-2 ring-accent/30" :
          isPinMode ? "border-accent/50 ring-2 ring-accent/20 cursor-crosshair" :
          "border-border/50 hover:border-accent/40 cursor-pointer"
        } ${isPinned ? "ring-2 ring-amber-500/30" : ""}`}
        onClick={handleClick}
      >
        {/* 배치 모드 오버레이 */}
        {isBatchMode && (
          <div
            className="absolute inset-0 z-20 rounded-2xl bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/30"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
          >
            {isSelected ? (
              <CheckSquare size={32} className="text-accent drop-shadow-lg" />
            ) : (
              <Square size={32} className="text-white/70 hover:text-white drop-shadow-lg" />
            )}
          </div>
        )}

        {/* 핀 상태 아이콘 */}
        {isPinned && !isBatchMode && (
          <div className="absolute top-2 right-2 z-10 bg-amber-500 rounded-full p-1 shadow-md">
            <Pin size={12} className="text-white rotate-45" />
          </div>
        )}

        {/* 좌측: 썸네일 & 기본 정보 (고정 너비) - 클릭시 콘텐츠 상세 모달 */}
        <div
          className={`w-[110px] sm:w-[120px] shrink-0 group/content h-full relative ${
            isBatchMode || isPinMode ? "pointer-events-none" : ""
          }`}
          onClick={(e) => {
            if (isBatchMode || isPinMode) return;
            e.stopPropagation();
            setIsViewingDetail(true);
          }}
        >
          <div className="relative w-full h-full rounded-xl overflow-hidden shadow-sm bg-bg-card border border-border/30 group-hover/content:ring-2 ring-accent/50 group-hover/content:shadow-lg">
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt={content.title}
                className="w-full h-full object-cover group-hover/content:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-400">
                <span className="text-xs">No Image</span>
              </div>
            )}

            {/* Title & Creator Overlay */}
            <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm py-2 px-2 text-center flex flex-col justify-end">
              <div className="font-bold text-xs text-white mb-0.5 truncate drop-shadow-sm" title={content.title}>
                {content.title}
              </div>
              <div className="text-[10px] text-gray-300 truncate drop-shadow-sm">
                {content.creator || "\u00A0"}
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 기록 관리 & 리뷰 (가변 너비) */}
        <div className={`flex-1 flex flex-col min-w-0 h-full group/record rounded-xl hover:bg-surface/50 p-1 -m-1 ${
          isBatchMode || isPinMode ? "pointer-events-none" : ""
        }`}>

          {/* 상단: 3행 레이아웃 - RecordInfoPanel 사용 */}
          <div className="h-[68px] shrink-0 mb-3">
            <RecordInfoPanel
              data={item}
              categories={categories}
              editable={!!(onDateChange || onProgressChange || onStatusChange || onCategoryChange)}
              onDateEdit={onDateChange ? () => setIsEditingDate(true) : undefined}
              onProgressEdit={onProgressChange ? () => setIsEditingProgress(true) : undefined}
              onStatusClick={canToggle ? handleStatusClick : undefined}
              onCategoryChange={onCategoryChange ? handleCategoryChange : undefined}
              canToggleStatus={canToggle}
            />
          </div>

          {/* 하단: Review (Remaining Area) - 클릭 시 상세 페이지로 이동 */}
          <div
            className="flex-1 bg-black/20 rounded-lg p-2.5 text-xs text-text-secondary leading-relaxed border border-white/5 overflow-hidden relative flex flex-col group/review hover:bg-black/30 hover:border-white/10 cursor-pointer"
            onClick={handleClick}
          >
            {item.review ? (
              <p className={`line-clamp-2 opacity-90 flex-1 ${item.is_spoiler && !showSpoiler ? "blur-sm select-none" : ""}`}>
                {item.review}
              </p>
            ) : (
              <p className="line-clamp-2 opacity-50 flex-1 italic">리뷰가 없습니다</p>
            )}
            <div className="mt-1 flex items-center justify-end text-[10px] gap-2">
              {item.review && item.is_spoiler && !showSpoiler && (
                <Button
                  unstyled
                  className="flex items-center gap-0.5 text-text-tertiary hover:text-accent font-medium"
                  onClick={(e) => { e.stopPropagation(); setShowSpoiler(true); }}
                >
                  <Eye size={10} /> 스포일러 보기
                </Button>
              )}
              {onDelete && (
                <Button
                  unstyled
                  className="flex items-center gap-0.5 text-text-tertiary hover:text-red-400 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
                      onDelete(item.id);
                    }
                  }}
                >
                  <Trash2 size={10} /> 삭제
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>
      
      {/* 진행도 수정 모달 */}
      {isEditingProgress && onProgressChange && (
        <ProgressModal
          title={content.title}
          value={progressPercent}
          isRecommended={item.is_recommended ?? false}
          onClose={() => setIsEditingProgress(false)}
          onSave={handleProgressChange}
          onRecommendChange={onRecommendChange ? (r) => onRecommendChange(item.id, r) : undefined}
        />
      )}

      {/* 날짜 수정 모달 */}
      {isEditingDate && onDateChange && (
        <DateEditModal
          title={content.title}
          createdAt={item.created_at}
          completedAt={item.completed_at}
          onClose={() => setIsEditingDate(false)}
          onSave={(newCreatedAt, newCompletedAt) => {
            if (newCreatedAt !== item.created_at) {
              onDateChange(item.id, "created_at", newCreatedAt);
            }
            if (newCompletedAt !== item.completed_at) {
              onDateChange(item.id, "completed_at", newCompletedAt || "");
            }
          }}
        />
      )}

      {/* 콘텐츠 상세 모달 */}
      {isViewingDetail && (
        <ContentDetailModal
          content={content}
          onClose={() => setIsViewingDetail(false)}
        />
      )}
    </>
  );
  // #endregion
}

