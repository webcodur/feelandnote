/*
  파일명: /components/features/cards/ContentCard.tsx
  기능: 콘텐츠 카드 컴포넌트 (도서, 영상, 게임, 음악)
  책임: 콘텐츠 정보를 카드 형태로 표시하고 상태/진행도 변경을 처리한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

import ProgressModal from "./ProgressModal";
import DateEditModal from "./DateEditModal";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";

// #region 타입
export interface ContentCardProps {
  item: UserContentWithContent;
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
  onRecommendChange?: (userContentId: string, isRecommended: boolean) => void;
  onDateChange?: (userContentId: string, field: "created_at" | "completed_at", date: string) => void;
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
  onProgressChange,
  onStatusChange,
  onRecommendChange,
  onDateChange,
  onDelete,
  href,
}: ContentCardProps) {
  // #region 훅
  const router = useRouter();
  // #endregion

  // #region 상태
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
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
    <div className="cursor-pointer relative">
      {/* 콘텐츠 영역 - 썸네일 + 제목 + 작가 */}
      <div className="group relative" onClick={handleClick}>
        {/* 삭제 버튼 (hover 시 표시) */}
        {onDelete && (
          <Button
            unstyled
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 hover:bg-red-600"
            style={{ zIndex: Z_INDEX.cardMenu }}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
                onDelete(item.id);
              }
            }}
          >
            <Trash2 size={14} />
          </Button>
        )}

        <div className="relative rounded-xl overflow-hidden shadow-xl bg-bg-card">
          <div className="relative w-full aspect-[3/4] overflow-hidden bg-gray-800">
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt={content.title}
                className="w-full h-full object-cover group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-400">
                <span className="text-xs">No Image</span>
              </div>
            )}
          </div>
          <div className="p-2 sm:p-3">
            <div className="font-semibold text-xs sm:text-sm mb-0.5 truncate">{content.title}</div>
            <div className="text-[10px] sm:text-xs text-text-secondary truncate">
              {content.creator || "\u00A0"}
            </div>
          </div>
        </div>
      </div>

      {/* 기록 영역 - 카드 외부, 리스트 형태 */}
      <div className="pt-2 space-y-1 text-xs sm:text-sm">
        {/* 기간 */}
        <div className="flex items-center gap-1.5">
          {onDateChange ? (
            <Button
              unstyled
              className="text-text-secondary hover:text-primary hover:bg-white/5 rounded px-1 -mx-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingDate(true);
              }}
            >
              [기간] {addedDate} ~ {completedDate || ""}
            </Button>
          ) : (
            <span className="text-text-secondary">[기간] {addedDate} ~ {completedDate || ""}</span>
          )}
        </div>
        {/* 진행 + 상태 */}
        <div className="flex items-center gap-1.5">
          {onProgressChange ? (
            <Button
              unstyled
              className="text-text-secondary hover:text-primary hover:bg-white/5 rounded px-1 -mx-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingProgress(true);
              }}
            >
              [진행] <span className="text-primary font-medium">{progressPercent}%</span>
            </Button>
          ) : (
            <span className="text-text-secondary">[진행] <span className="text-primary font-medium">{progressPercent}%</span></span>
          )}
          {status && (
            <Button
              unstyled
              className={`${status.class} ${canToggle ? "hover:bg-white/5 rounded px-1" : "cursor-default"}`}
              onClick={handleStatusClick}
            >
              [{status.text}]
            </Button>
          )}
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
    </div>
  );
  // #endregion
}

