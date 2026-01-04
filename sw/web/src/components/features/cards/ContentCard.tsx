/*
  파일명: /components/features/cards/ContentCard.tsx
  기능: 콘텐츠 카드 컴포넌트 (도서, 영상, 게임, 음악)
  책임: 콘텐츠 정보를 카드 형태로 표시하고 상태/진행도 변경을 처리한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Trash2, Star, Eye, FolderOpen, Check } from "lucide-react";
import type { CategoryWithCount } from "@/types/database";

import ProgressModal from "./ProgressModal";
import DateEditModal from "./DateEditModal";
import ContentDetailModal from "./ContentDetailModal";
import Button from "@/components/ui/Button";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
export interface ContentCardProps {
  item: UserContentWithContent;
  categories?: CategoryWithCount[];
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
  onRecommendChange?: (userContentId: string, isRecommended: boolean) => void;
  onDateChange?: (userContentId: string, field: "created_at" | "completed_at", date: string) => void;
  onCategoryChange?: (userContentId: string, categoryId: string | null) => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
}
// #endregion

// #region 상수
const STATUS_STYLES = {
  EXPERIENCE: { class: "text-green-400 border-green-600", text: "진행" },
  WISH: { class: "text-yellow-300 border-yellow-600", text: "관심" },
  COMPLETE: { class: "text-blue-400 border-blue-600", text: "완료" },
  RECOMMEND: { class: "text-pink-400 border-pink-600", text: "추천" },
};
// #endregion

// #region 유틸
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
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
}: ContentCardProps) {
  // #region 훅
  const router = useRouter();
  // #endregion

  // #region 상태
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isViewingDetail, setIsViewingDetail] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  // #endregion

  // #region 파생 값
  const content = item.content;
  const progressPercent = item.progress ?? 0;
  const addedDate = formatDate(item.created_at);
  const completedDate = item.completed_at ? formatDate(item.completed_at) : null;
  // #endregion

  // #region 핸들러
  const handleClick = () => {
    if (href) router.push(href);
  };

  const handleProgressChange = (value: number) => {
    onProgressChange?.(item.id, value);
    setIsEditingProgress(false);
  };
  // #endregion

  // #region 파생 값 (상태 관련)
  const isComplete = item.status === "COMPLETE";
  const isRecommended = item.is_recommended ?? false;
  const displayStatus = isComplete && isRecommended ? "RECOMMEND" : item.status;
  const status = displayStatus ? STATUS_STYLES[displayStatus as keyof typeof STATUS_STYLES] : null;
  const canToggleStatus = progressPercent === 0 && onStatusChange && !isComplete;
  const canToggleRecommend = isComplete && onRecommendChange;
  const canToggle = canToggleStatus || canToggleRecommend;
  // #endregion

  // #region 핸들러 (상태)
  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canToggleStatus && onStatusChange) {
      onStatusChange(item.id, item.status === "WISH" ? "EXPERIENCE" : "WISH");
    } else if (canToggleRecommend && onRecommendChange) {
      onRecommendChange(item.id, !isRecommended);
    }
  };
  // #endregion

  // #region 렌더링
  return (
    <>
      <div
        className="cursor-pointer relative flex flex-row h-[200px] bg-surface/30 border border-border/50 hover:border-accent/40 rounded-2xl p-2.5 gap-3"
        onClick={handleClick}
      >

        {/* 좌측: 썸네일 & 기본 정보 (고정 너비) - 클릭시 콘텐츠 상세 모달 */}
        <div
          className="w-[110px] sm:w-[120px] shrink-0 group/content h-full relative"
          onClick={(e) => {
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
        <div className="flex-1 flex flex-col min-w-0 h-full group/record rounded-xl hover:bg-surface/50 p-1 -m-1">
          
          {/* 상단: 3행 레이아웃 */}
          <div className="flex flex-col gap-1.5 h-[68px] shrink-0 mb-3 text-xs">

            {/* Row 1: 시작 | 종료 */}
            <div className="h-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-text-tertiary font-medium shrink-0 select-none w-8">시작:</span>
                {onDateChange ? (
                  <Button
                    unstyled
                    className="text-text-secondary hover:text-accent hover:underline"
                    onClick={(e) => { e.stopPropagation(); setIsEditingDate(true); }}
                  >
                    {addedDate}
                  </Button>
                ) : <span className="text-text-secondary">{addedDate}</span>}
              </div>
              <div className="flex items-center gap-2 min-w-[120px]">
                <span className="text-text-tertiary font-medium select-none w-8">종료:</span>
                {onDateChange ? (
                  <Button
                    unstyled
                    className="text-text-secondary hover:text-accent hover:underline"
                    onClick={(e) => { e.stopPropagation(); setIsEditingDate(true); }}
                  >
                    {completedDate || "-"}
                  </Button>
                ) : <span className="text-text-secondary">{completedDate || "-"}</span>}
              </div>
            </div>

            {/* Row 2: 진행 | 상태 */}
            <div className="h-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-text-tertiary font-medium shrink-0 select-none w-8">진행:</span>
                {onProgressChange ? (
                  <Button
                    unstyled
                    className="text-primary font-medium hover:text-accent hover:underline"
                    onClick={(e) => { e.stopPropagation(); setIsEditingProgress(true); }}
                  >
                    {progressPercent}%
                  </Button>
                ) : <span className="text-primary font-medium">{progressPercent}%</span>}
              </div>
              <div className="flex items-center gap-2 min-w-[120px]">
                <span className="text-text-tertiary font-medium select-none w-8">상태:</span>
                {status && (
                  <Button
                    unstyled
                    className={`${status.class} ${canToggle ? "hover:bg-white/5" : "cursor-default"} text-[10px] border px-2 py-0.5 rounded-full flex items-center font-medium`}
                    onClick={handleStatusClick}
                  >
                    {status.text}
                  </Button>
                )}
              </div>
            </div>

            {/* Row 3: 분류 | 별점 */}
            <div className="h-5 flex items-center justify-between">
              <div className="flex items-center gap-2 relative">
                <span className="text-text-tertiary font-medium shrink-0 select-none w-8">분류:</span>
                {onCategoryChange ? (
                  <Button
                    unstyled
                    className="text-text-secondary hover:text-accent text-xs truncate max-w-[80px] flex items-center gap-1"
                    onClick={(e) => { e.stopPropagation(); setIsCategoryOpen(!isCategoryOpen); }}
                  >
                    <FolderOpen size={10} />
                    {item.category?.name || "미분류"}
                  </Button>
                ) : (
                  <span className="text-text-secondary text-xs truncate max-w-[80px]">
                    {item.category?.name || "미분류"}
                  </span>
                )}

                {/* 분류 선택 드롭다운 */}
                {isCategoryOpen && onCategoryChange && (
                  <div
                    className="absolute top-6 left-0 z-50 bg-bg-card border border-border rounded-lg shadow-xl py-1 min-w-[120px] max-h-[200px] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center justify-between"
                      onClick={() => { onCategoryChange(item.id, null); setIsCategoryOpen(false); }}
                    >
                      미분류
                      {!item.category_id && <Check size={12} className="text-accent" />}
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center justify-between"
                        onClick={() => { onCategoryChange(item.id, cat.id); setIsCategoryOpen(false); }}
                      >
                        {cat.name}
                        {item.category_id === cat.id && <Check size={12} className="text-accent" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 min-w-[120px]">
                <span className="text-text-tertiary font-medium select-none w-8">별점:</span>
                {item.rating ? (
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star
                        key={i}
                        size={11}
                        className={i <= item.rating! ? "text-yellow-500" : "text-gray-600"}
                        fill={i <= item.rating! ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-text-tertiary text-[10px]">-</span>
                )}
              </div>
            </div>

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

