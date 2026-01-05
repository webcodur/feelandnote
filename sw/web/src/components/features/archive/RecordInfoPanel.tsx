/*
  파일명: /components/features/archive/RecordInfoPanel.tsx
  기능: 기록 정보 패널 (편집/읽기 전용 모드 지원)
  책임: 시작/종료, 진행/상태, 분류/별점을 표시하고 편집 모드에서는 수정 가능하게 한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { Star, FolderOpen, Check, Eye } from "lucide-react";
import Button from "@/components/ui/Button";
import type { CategoryWithCount } from "@/types/database";

// #region 상수
export const STATUS_STYLES: Record<string, { class: string; text: string }> = {
  // 레거시 호환
  EXPERIENCE: { class: "text-green-400 border-green-600", text: "진행" },
  WISH: { class: "text-yellow-300 border-yellow-600", text: "관심" },
  COMPLETE: { class: "text-blue-400 border-blue-600", text: "완료" },
  RECOMMEND: { class: "text-pink-400 border-pink-600", text: "추천" },
  // 현재 상태
  WANT: { class: "text-yellow-300 border-yellow-600", text: "관심" },
  WATCHING: { class: "text-green-400 border-green-600", text: "진행" },
  DROPPED: { class: "text-red-400 border-red-600", text: "중단" },
  FINISHED: { class: "text-blue-400 border-blue-600", text: "완료" },
  RECOMMENDED: { class: "text-pink-400 border-pink-600", text: "추천" },
  NOT_RECOMMENDED: { class: "text-gray-400 border-gray-600", text: "비추" },
};

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}
// #endregion

// #region 타입
interface RecordData {
  id: string;
  status: string;
  progress: number | null;
  rating: number | null;
  review?: string | null;
  is_spoiler?: boolean | null;
  is_recommended?: boolean | null;
  created_at: string;
  completed_at: string | null;
  category_id?: string | null;
  category?: { name: string } | null;
}

interface RecordInfoPanelProps {
  data: RecordData;
  categories?: CategoryWithCount[];
  editable?: boolean;
  showReview?: boolean;
  fillHeight?: boolean;
  onDateEdit?: () => void;
  onProgressEdit?: () => void;
  onStatusClick?: () => void;
  onCategoryChange?: (categoryId: string | null) => void;
  canToggleStatus?: boolean;
}
// #endregion

export default function RecordInfoPanel({
  data,
  categories = [],
  editable = false,
  showReview = false,
  fillHeight = false,
  onDateEdit,
  onProgressEdit,
  onStatusClick,
  onCategoryChange,
  canToggleStatus = false,
}: RecordInfoPanelProps) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(false);

  const addedDate = formatDate(data.created_at);
  const completedDate = data.completed_at ? formatDate(data.completed_at) : null;
  const progressPercent = data.progress ?? 0;

  // 상태 스타일 결정
  const isComplete = data.status === "FINISHED" || data.status === "FINISHED";
  const isRecommended = data.is_recommended ?? false;
  const displayStatus = isComplete && isRecommended ? "RECOMMEND" : data.status;
  const status = STATUS_STYLES[displayStatus];

  return (
    <div className={`flex flex-col gap-1.5 text-xs ${fillHeight ? "h-full" : ""}`}>
      {/* Row 1: 시작 | 종료 */}
      <div className="h-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary font-medium shrink-0 select-none w-8">시작:</span>
          {editable && onDateEdit ? (
            <Button
              unstyled
              className="text-text-secondary hover:text-accent hover:underline"
              onClick={(e) => { e.stopPropagation(); onDateEdit(); }}
            >
              {addedDate}
            </Button>
          ) : (
            <span className="text-text-secondary">{addedDate}</span>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-text-tertiary font-medium select-none w-8">종료:</span>
          {editable && onDateEdit ? (
            <Button
              unstyled
              className="text-text-secondary hover:text-accent hover:underline"
              onClick={(e) => { e.stopPropagation(); onDateEdit(); }}
            >
              {completedDate || "-"}
            </Button>
          ) : (
            <span className="text-text-secondary">{completedDate || "-"}</span>
          )}
        </div>
      </div>

      {/* Row 2: 진행 | 상태 */}
      <div className="h-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary font-medium shrink-0 select-none w-8">진행:</span>
          {editable && onProgressEdit ? (
            <Button
              unstyled
              className="text-primary font-medium hover:text-accent hover:underline"
              onClick={(e) => { e.stopPropagation(); onProgressEdit(); }}
            >
              {progressPercent}%
            </Button>
          ) : (
            <span className="text-accent font-medium">{progressPercent}%</span>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-text-tertiary font-medium select-none w-8">상태:</span>
          {status && (
            <Button
              unstyled
              className={`${status.class} ${editable && canToggleStatus ? "hover:bg-white/5" : "cursor-default"} text-[10px] border px-2 py-0.5 rounded-full flex items-center font-medium`}
              onClick={editable && onStatusClick ? (e) => { e.stopPropagation(); onStatusClick(); } : undefined}
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
          {editable && onCategoryChange ? (
            <Button
              unstyled
              className="text-text-secondary hover:text-accent text-xs truncate max-w-[80px] flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); setIsCategoryOpen(!isCategoryOpen); }}
            >
              <FolderOpen size={10} />
              {data.category?.name || "미분류"}
            </Button>
          ) : (
            <span className="text-text-secondary text-xs truncate max-w-[80px]">
              {data.category?.name || "미분류"}
            </span>
          )}

          {/* 분류 선택 드롭다운 */}
          {isCategoryOpen && editable && onCategoryChange && (
            <div
              className="absolute top-6 left-0 z-50 bg-bg-card border border-border rounded-lg shadow-xl py-1 min-w-[120px] max-h-[200px] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center justify-between"
                onClick={() => { onCategoryChange(null); setIsCategoryOpen(false); }}
              >
                미분류
                {!data.category_id && <Check size={12} className="text-accent" />}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center justify-between"
                  onClick={() => { onCategoryChange(cat.id); setIsCategoryOpen(false); }}
                >
                  {cat.name}
                  {data.category_id === cat.id && <Check size={12} className="text-accent" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-[120px]">
          <span className="text-text-tertiary font-medium select-none w-8">별점:</span>
          {data.rating ? (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={11}
                  className={i <= data.rating! ? "text-yellow-500" : "text-gray-600"}
                  fill={i <= data.rating! ? "currentColor" : "none"}
                />
              ))}
            </div>
          ) : (
            <span className="text-text-tertiary text-[10px]">-</span>
          )}
        </div>
      </div>

      {/* Row 4: 리뷰 (옵션) */}
      {showReview && (
        <div className={`mt-2 bg-black/20 rounded-lg p-2.5 border border-white/5 ${fillHeight ? "flex-1 flex flex-col" : ""}`}>
          {data.review ? (
            <div className="relative">
              <p className={`text-text-secondary leading-relaxed line-clamp-2 ${data.is_spoiler && !showSpoiler ? "blur-sm select-none" : ""}`}>
                {data.review}
              </p>
              {data.is_spoiler && !showSpoiler && (
                <Button
                  unstyled
                  className="absolute inset-0 flex items-center justify-center text-text-tertiary hover:text-accent text-[10px] font-medium gap-1"
                  onClick={(e) => { e.stopPropagation(); setShowSpoiler(true); }}
                >
                  <Eye size={10} /> 스포일러 보기
                </Button>
              )}
            </div>
          ) : (
            <p className="text-text-tertiary italic">리뷰 없음</p>
          )}
        </div>
      )}
    </div>
  );
}
