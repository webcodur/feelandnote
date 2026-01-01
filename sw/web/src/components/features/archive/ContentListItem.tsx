/*
  파일명: /components/features/archive/ContentListItem.tsx
  기능: 리스트 뷰용 콘텐츠 아이템 컴포넌트
  책임: 콘텐츠 정보를 리스트 행 형태로 표시하고 상태/진행도 변경을 처리한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import ProgressModal from "@/components/features/cards/ProgressModal";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
interface ContentListItemProps {
  item: UserContentWithContent;
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
  onRecommendChange?: (userContentId: string, isRecommended: boolean) => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
}
// #endregion

// #region 상수
const STATUS_STYLES = {
  EXPERIENCE: { class: "text-green-400", text: "진행" },
  WISH: { class: "text-yellow-300", text: "관심" },
  COMPLETE: { class: "text-blue-400", text: "완료" },
  RECOMMEND: { class: "text-pink-400", text: "추천" },
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
}: ContentListItemProps) {
  // #region 훅
  const router = useRouter();
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  // #endregion

  // #region 파생 값
  const content = item.content;
  const progressPercent = item.progress ?? 0;
  const addedDate = formatDate(item.created_at);
  const isComplete = item.status === "COMPLETE";
  const isRecommended = item.is_recommended ?? false;
  const displayStatus = isComplete && isRecommended ? "RECOMMEND" : item.status;
  const status = displayStatus ? STATUS_STYLES[displayStatus as keyof typeof STATUS_STYLES] : null;
  const canToggleStatus = progressPercent === 0 && onStatusChange && !isComplete;
  const canToggleRecommend = isComplete && onRecommendChange;
  const canToggle = canToggleStatus || canToggleRecommend;
  // #endregion

  // #region 핸들러
  const handleClick = () => {
    if (href) router.push(href);
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isComplete && onRecommendChange) {
      onRecommendChange(item.id, !isRecommended);
      return;
    }
    if (!onStatusChange) return;

    if (item.status === "EXPERIENCE" && progressPercent > 0) {
      if (confirm(`진행도 ${progressPercent}%가 초기화됩니다. 계속할까요?`)) {
        onProgressChange?.(item.id, 0);
        onStatusChange(item.id, "WISH");
      }
      return;
    }
    onStatusChange(item.id, item.status === "WISH" ? "EXPERIENCE" : "WISH");
  };
  // #endregion

  // #region 렌더링
  return (
    <div
      className="group grid grid-cols-[1fr_44px_40px_36px_24px] items-center gap-2 py-1.5 px-3 rounded hover:bg-bg-secondary/50 cursor-pointer"
      onClick={handleClick}
    >
      {/* 제목 + 작가 */}
      <div className="min-w-0 flex items-center gap-2">
        <p className="text-sm text-text-primary truncate">{content.title}</p>
        {content.creator && (
          <span className="text-xs text-text-secondary truncate shrink-0">· {content.creator}</span>
        )}
      </div>

      {/* 상태 */}
      <div className="flex justify-center">
        {status && (
          <Button
            unstyled
            className={`text-[11px] font-medium ${status.class} ${canToggle ? "hover:opacity-70" : "cursor-default"}`}
            onClick={handleStatusClick}
          >
            {status.text}
          </Button>
        )}
      </div>

      {/* 등록일 */}
      <div className="text-[11px] text-text-secondary text-center">{addedDate}</div>

      {/* 진행도 */}
      <div className="flex justify-center">
        {onProgressChange ? (
          <Button
            unstyled
            className="text-[11px] font-medium text-text-secondary hover:text-accent"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingProgress(true);
            }}
          >
            {progressPercent}%
          </Button>
        ) : (
          <span className="text-[11px] font-medium text-text-secondary">{progressPercent}%</span>
        )}
      </div>

      {/* 삭제 버튼 */}
      <div className="flex justify-center">
        {onDelete && (
          <Button
            unstyled
            className="p-0.5 rounded text-text-secondary opacity-0 group-hover:opacity-100 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("삭제하시겠습니까?")) onDelete(item.id);
            }}
          >
            <Trash2 size={12} />
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
