/*
  파일명: /components/features/archive/ContentListItem.tsx
  기능: 리스트 뷰용 콘텐츠 아이템 컴포넌트
  책임: 콘텐츠 정보를 리스트 행 형태로 표시하고 상태 변경을 처리한다.
*/ // ------------------------------
"use client";

import { useRouter } from "next/navigation";

import { Trash2, BookOpen, Film, Gamepad2, Music, Award, Star, CheckSquare, Square } from "lucide-react";

import Button from "@/components/ui/Button";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import type { ContentType, ContentStatus } from "@/types/database";

// #region 타입
interface ContentListItemProps {
  item: UserContentWithContent;
  onStatusChange?: (userContentId: string, status: ContentStatus) => void;
  onRecommendChange?: (userContentId: string, isRecommended: boolean) => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
  // 배치 모드
  isBatchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  // 읽기 전용 모드 (타인 기록관)
  readOnly?: boolean;
}
// #endregion

// #region 상수
const STATUS_STYLES: Record<ContentStatus, { class: string; text: string }> = {
  WANT: { class: "text-yellow-300", text: "관심" },
  WATCHING: { class: "text-green-400", text: "진행중" },
  DROPPED: { class: "text-red-400", text: "중단" },
  FINISHED: { class: "text-blue-400", text: "완료" },
  RECOMMENDED: { class: "text-pink-400", text: "추천" },
  NOT_RECOMMENDED: { class: "text-gray-400", text: "비추" },
};

const TYPE_ICONS: Record<ContentType, { icon: typeof BookOpen; label: string }> = {
  BOOK: { icon: BookOpen, label: "도서" },
  VIDEO: { icon: Film, label: "영상" },
  GAME: { icon: Gamepad2, label: "게임" },
  MUSIC: { icon: Music, label: "음악" },
  CERTIFICATE: { icon: Award, label: "자격증" },
};

const GRID_COLUMNS = {
  compact: "grid-cols-[24px_minmax(100px,1fr)_minmax(60px,100px)_52px_40px_48px_48px_40px_minmax(60px,140px)_24px]",
  default: "grid-cols-[28px_minmax(120px,1fr)_minmax(80px,120px)_56px_44px_52px_52px_44px_minmax(80px,180px)_28px]",
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
  onStatusChange: _onStatusChange,
  onRecommendChange: _onRecommendChange,
  onDelete,
  href,
  compact = false,
  isBatchMode = false,
  isSelected = false,
  onToggleSelect,
  readOnly = false,
}: ContentListItemProps) {
  // 리스트 뷰에서는 인라인 상태 변경을 지원하지 않음
  void _onStatusChange;
  void _onRecommendChange;
  // #region 훅
  const router = useRouter();
  // #endregion

  // #region 파생 값
  const content = item.content;
  const addedDate = formatDate(item.created_at);
  const statusStyle = STATUS_STYLES[item.status as ContentStatus];
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
          <Button
            unstyled
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
          </Button>
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
        <p className={`${textSize} text-text-tertiary truncate`}>{content.creator?.replace(/\^/g, ', ') || "-"}</p>
      </div>

      {/* 4. 분류 */}
      <div className="flex justify-center">
        <span className={`${textSize} text-text-tertiary truncate`}>{categoryName || "-"}</span>
      </div>

      {/* 5. 상태 */}
      <div className="flex justify-center">
        <span className={`${textSize} font-medium ${statusStyle.class}`}>
          {statusStyle.text}
        </span>
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

      {/* 9. 리뷰 */}
      <div className="min-w-0">
        <p className={`${textSize} text-text-tertiary truncate`}>{review || "-"}</p>
      </div>

      {/* 10. 삭제 버튼 */}
      <div className="flex justify-center">
        {!readOnly && onDelete && (
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
    </div>
  );
  // #endregion
}
