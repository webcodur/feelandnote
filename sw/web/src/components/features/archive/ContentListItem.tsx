/*
  파일명: /components/features/archive/ContentListItem.tsx
  기능: 리스트 뷰용 콘텐츠 아이템 컴포넌트
  책임: 콘텐츠 정보를 리스트 행 형태로 표시하고 상태/진행도 변경을 처리한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Trash2, BookOpen, Film, Gamepad2, Music, Award, Star, CheckSquare, Square } from "lucide-react";

import Button from "@/components/ui/Button";
import ProgressModal from "@/components/features/cards/ProgressModal";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { ContentType } from "@/types/database";

// #region 타입
interface ContentListItemProps {
  item: UserContentWithContent;
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WANT" | "WATCHING" | "FINISHED") => void;
  onRecommendChange?: (userContentId: string, isRecommended: boolean) => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
  // 배치 모드
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}
// #endregion

// #region 상수
const STATUS_STYLES = {
  EXPERIENCE: { class: "text-green-400", text: "진행" },
  WANT: { class: "text-yellow-300", text: "관심" },
  FINISHED: { class: "text-blue-400", text: "완료" },
  RECOMMEND: { class: "text-pink-400", text: "추천" },
};

const TYPE_ICONS: Record<ContentType, { icon: typeof BookOpen; label: string }> = {
  BOOK: { icon: BookOpen, label: "도서" },
  VIDEO: { icon: Film, label: "영상" },
  GAME: { icon: Gamepad2, label: "게임" },
  MUSIC: { icon: Music, label: "음악" },
  CERTIFICATE: { icon: Award, label: "자격증" },
};

const GRID_COLUMNS = {
  compact: "grid-cols-[24px_minmax(100px,1fr)_minmax(60px,100px)_52px_40px_48px_48px_40px_36px_minmax(60px,140px)_24px]",
  default: "grid-cols-[28px_minmax(120px,1fr)_minmax(80px,120px)_56px_44px_52px_52px_44px_40px_minmax(80px,180px)_28px]",
};
// #endregion

// #region 유틸
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}`;
}
// #endregion

export default function ContentListItem({
  item,
  onProgressChange,
  onStatusChange,
  onRecommendChange,
  onDelete,
  href,
  compact = false,
  isBatchMode = false,
  isSelected = false,
  onToggleSelect,
}: ContentListItemProps) {
  // #region 훅
  const router = useRouter();
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  // #endregion

  // #region 파생 값
  const content = item.content;
  const progressPercent = item.progress ?? 0;
  const addedDate = formatDate(item.created_at);
  const isComplete = item.status === "FINISHED";
  const isRecommended = item.is_recommended ?? false;
  const displayStatus = isComplete && isRecommended ? "RECOMMEND" : item.status;
  const status = displayStatus ? STATUS_STYLES[displayStatus as keyof typeof STATUS_STYLES] : null;
  const canToggleStatus = progressPercent === 0 && onStatusChange && !isComplete;
  const canToggleRecommend = isComplete && onRecommendChange;
  const canToggle = canToggleStatus || canToggleRecommend;
  const typeInfo = TYPE_ICONS[content.type as ContentType];
  const TypeIcon = typeInfo?.icon;
  const gridClass = compact ? GRID_COLUMNS.compact : GRID_COLUMNS.default;
  const iconSize = compact ? 14 : 16;
  const textSize = compact ? "text-[10px]" : "text-[11px]";
  const titleSize = compact ? "text-[11px]" : "text-xs";
  const completedDate = item.completed_at ? formatDate(item.completed_at) : "-";
  const rating = item.rating;
  const review = item.review;
  const categoryName = item.category?.name;
  // #endregion

  // #region 핸들러
  const handleClick = () => {
    if (isBatchMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    if (href) router.push(href);
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isComplete && onRecommendChange) {
      onRecommendChange(item.id, !isRecommended);
      return;
    }
    if (!onStatusChange) return;

    if (item.status === "WATCHING" && progressPercent > 0) {
      if (confirm(`진행도 ${progressPercent}%가 초기화됩니다. 계속할까요?`)) {
        onProgressChange?.(item.id, 0);
        onStatusChange(item.id, "WANT");
      }
      return;
    }
    onStatusChange(item.id, item.status === "WANT" ? "WATCHING" : "WANT");
  };
  // #endregion

  // #region 렌더링
  return (
    <div
      className={`group grid ${gridClass} items-center gap-2 py-1 ${compact ? "px-2" : "px-3"} rounded cursor-pointer ${
        isSelected ? "bg-accent/10" : "hover:bg-bg-secondary/50"
      }`}
      onClick={handleClick}
    >
      {/* 1. 타입 아이콘 / 배치 모드 체크박스 */}
      <div className="flex justify-center">
        {isBatchMode ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            className="p-0"
          >
            {isSelected ? (
              <CheckSquare size={iconSize} className="text-accent" />
            ) : (
              <Square size={iconSize} className="text-text-tertiary hover:text-text-secondary" />
            )}
          </button>
        ) : (
          TypeIcon && <TypeIcon size={iconSize} className="text-text-tertiary" />
        )}
      </div>

      {/* 2. 제목 */}
      <div className="min-w-0">
        <p className={`${titleSize} text-text-primary truncate`}>{content.title}</p>
      </div>

      {/* 3. 작가 */}
      <div className="min-w-0">
        <p className={`${textSize} text-text-tertiary truncate`}>{content.creator || "-"}</p>
      </div>

      {/* 4. 분류 */}
      <div className="flex justify-center">
        <span className={`${textSize} text-text-tertiary truncate`}>{categoryName || "-"}</span>
      </div>

      {/* 5. 상태 */}
      <div className="flex justify-center">
        {status && (
          <Button
            unstyled
            className={`${textSize} font-medium ${status.class} ${canToggle ? "hover:opacity-70" : "cursor-default"}`}
            onClick={handleStatusClick}
          >
            {status.text}
          </Button>
        )}
      </div>

      {/* 6. 시작일 */}
      <div className={`${textSize} text-text-secondary text-center`}>{addedDate}</div>

      {/* 7. 종료일 */}
      <div className={`${textSize} text-text-secondary text-center`}>{completedDate}</div>

      {/* 8. 별점 */}
      <div className="flex items-center justify-center gap-0.5">
        {rating ? (
          <>
            <Star size={compact ? 10 : 11} className="text-yellow-400" fill="currentColor" />
            <span className={`${textSize} text-yellow-400`}>{rating.toFixed(1)}</span>
          </>
        ) : (
          <span className={`${textSize} text-text-tertiary`}>-</span>
        )}
      </div>

      {/* 9. 진행도 */}
      <div className="flex justify-center">
        {onProgressChange ? (
          <Button
            unstyled
            className={`${textSize} font-medium text-text-secondary hover:text-accent`}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingProgress(true);
            }}
          >
            {progressPercent}%
          </Button>
        ) : (
          <span className={`${textSize} font-medium text-text-secondary`}>{progressPercent}%</span>
        )}
      </div>

      {/* 10. 리뷰 */}
      <div className="min-w-0">
        <p className={`${textSize} text-text-tertiary truncate`}>{review || "-"}</p>
      </div>

      {/* 11. 삭제 버튼 */}
      <div className="flex justify-center">
        {onDelete && (
          <Button
            unstyled
            className="p-0.5 rounded text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("삭제하시겠습니까?")) onDelete(item.id);
            }}
          >
            <Trash2 size={compact ? 10 : 11} />
          </Button>
        )}
      </div>

      {/* 진행도 수정 모달 */}
      {isEditingProgress && onProgressChange && (
        <ProgressModal
          title={content.title}
          value={progressPercent}
          isRecommended={isRecommended}
          onClose={() => setIsEditingProgress(false)}
          onSave={(value) => {
            onProgressChange(item.id, value);
            setIsEditingProgress(false);
          }}
          onRecommendChange={onRecommendChange ? (r) => onRecommendChange(item.id, r) : undefined}
        />
      )}
    </div>
  );
  // #endregion
}
