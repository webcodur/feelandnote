/*
  파일명: /components/features/archive/RecordInfoPanel.tsx
  기능: 기록 정보 패널 (편집/읽기 전용 모드 지원)
  책임: 시작/종료, 상태, 분류/별점을 표시하고 편집 모드에서는 수정 가능하게 한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { FolderOpen, Check, Eye, Globe, Users, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import type { CategoryWithCount, VisibilityType } from "@/types/database";

// #region 상수
export const STATUS_STYLES: Record<string, { class: string; text: string }> = {
  WANT: { class: "text-yellow-300 border-yellow-600", text: "관심" },
  WATCHING: { class: "text-green-400 border-green-600", text: "진행중" },
  DROPPED: { class: "text-red-400 border-red-600", text: "중단" },
  FINISHED: { class: "text-blue-400 border-blue-600", text: "완료" },
  RECOMMENDED: { class: "text-pink-400 border-pink-600", text: "추천" },
  NOT_RECOMMENDED: { class: "text-gray-400 border-gray-600", text: "비추" },
};

const VISIBILITY_OPTIONS: { value: VisibilityType; label: string; icon: typeof Globe; class: string }[] = [
  { value: "public", label: "전체", icon: Globe, class: "text-green-400" },
  { value: "followers", label: "팔로워", icon: Users, class: "text-blue-400" },
  { value: "private", label: "비공개", icon: Lock, class: "text-gray-400" },
];

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
  rating: number | null;
  review?: string | null;
  is_spoiler?: boolean | null;
  is_recommended?: boolean | null;
  visibility?: VisibilityType | null;
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
  onStatusClick?: () => void;
  onCategoryChange?: (categoryId: string | null) => void;
  onVisibilityChange?: (visibility: VisibilityType) => void;
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
  onStatusClick,
  onCategoryChange,
  onVisibilityChange,
  canToggleStatus = false,
}: RecordInfoPanelProps) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(false);

  const addedDate = formatDate(data.created_at);
  const completedDate = data.completed_at ? formatDate(data.completed_at) : null;

  // 상태 스타일 결정
  const status = STATUS_STYLES[data.status] || STATUS_STYLES.WANT;

  return (
    <div className={`@container flex flex-col gap-1.5 text-xs ${fillHeight ? "h-full" : ""}`}>
      {/* 3 Rows x 2 Columns Grid Layout */}
      <div className="flex flex-col border border-white/10 rounded-lg divide-y divide-white/10 text-xs">
        {/* Row 1: 시작 | 종료 */}
        <div className="flex-1 flex divide-x divide-white/10 overflow-hidden">
          <div className="flex-1 flex items-center justify-between px-3 py-1 min-w-0">
            <span className="text-text-tertiary select-none shrink-0">시작</span>
            {editable && onDateEdit ? (
              <Button
                unstyled
                className="text-text-secondary hover:text-accent hover:underline truncate text-right ml-2"
                onClick={(e) => { e.stopPropagation(); onDateEdit(); }}
              >
                {addedDate}
              </Button>
            ) : (
              <span className="text-text-secondary truncate text-right ml-2">{addedDate}</span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-between px-3 py-1 min-w-0">
            <span className="text-text-tertiary select-none shrink-0">종료</span>
            {editable && onDateEdit ? (
              <Button
                unstyled
                className="text-text-secondary hover:text-accent hover:underline truncate text-right ml-2"
                onClick={(e) => { e.stopPropagation(); onDateEdit(); }}
              >
                {completedDate || "-"}
              </Button>
            ) : (
              <span className="text-text-secondary truncate text-right ml-2">{completedDate || "-"}</span>
            )}
          </div>
        </div>

        {/* Row 2: 상태 | 공개 */}
        <div className="flex-1 flex divide-x divide-white/10 overflow-visible relative z-10">
          <div className="flex-1 flex items-center justify-between px-3 py-1 min-w-0">
            <span className="text-text-tertiary select-none shrink-0">상태</span>
            {status && (
              <Button
                unstyled
                className={`${status.class} ${editable && canToggleStatus ? "hover:bg-white/5" : "cursor-default"} text-[10px] px-2 py-0.5 rounded-sm flex items-center font-medium truncate ml-2`}
                onClick={editable && onStatusClick ? (e) => { e.stopPropagation(); onStatusClick(); } : undefined}
              >
                {status.text}
              </Button>
            )}
          </div>
          <div className="flex-1 flex items-center justify-between px-3 py-1 min-w-0 relative">
            <span className="text-text-tertiary select-none shrink-0">공개</span>
            {(() => {
              const currentVisibility = VISIBILITY_OPTIONS.find(v => v.value === (data.visibility ?? "public")) ?? VISIBILITY_OPTIONS[0];
              const Icon = currentVisibility.icon;
              return editable && onVisibilityChange ? (
                <>
                  <Button
                    unstyled
                    className={`${currentVisibility.class} hover:bg-white/5 text-[10px] flex items-center gap-1 font-medium truncate ml-2`}
                    onClick={(e) => { e.stopPropagation(); setIsVisibilityOpen(!isVisibilityOpen); }}
                  >
                    <Icon size={12} />
                    {currentVisibility.label}
                  </Button>
                  {isVisibilityOpen && (
                    <div
                      className="absolute top-8 right-0 w-[120px] z-50 bg-bg-card border border-border rounded-lg shadow-xl py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {VISIBILITY_OPTIONS.map((opt) => {
                        const OptIcon = opt.icon;
                        return (
                          <Button
                            unstyled
                            key={opt.value}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center justify-between gap-2"
                            onClick={() => { onVisibilityChange(opt.value); setIsVisibilityOpen(false); }}
                          >
                            <span className={`flex items-center gap-1 ${opt.class}`}>
                              <OptIcon size={12} />
                              {opt.label}
                            </span>
                            {data.visibility === opt.value && <Check size={12} className="text-accent" />}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <span className={`${currentVisibility.class} text-[10px] flex items-center gap-1 truncate ml-2`}>
                  <Icon size={12} />
                  {currentVisibility.label}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Row 3: 분류 | 별점 */}
        <div className="flex-1 flex divide-x divide-white/10 overflow-visible relative z-0">
          <div className="flex-1 flex items-center justify-between px-3 py-1 min-w-0 relative">
            <span className="text-text-tertiary select-none shrink-0">분류</span>
            {editable && onCategoryChange ? (
              <Button
                unstyled
                className="text-text-secondary hover:text-accent text-xs truncate flex items-center gap-1 max-w-[80px] ml-2"
                onClick={(e) => { e.stopPropagation(); setIsCategoryOpen(!isCategoryOpen); }}
              >
                {data.category?.name || "미분류"}
              </Button>
            ) : (
              <span className="text-text-secondary text-xs truncate max-w-[80px] ml-2">
                {data.category?.name || "미분류"}
              </span>
            )}

            {/* 분류 선택 드롭다운 */}
            {isCategoryOpen && editable && onCategoryChange && (
              <div
                className="absolute bottom-8 left-0 z-50 bg-bg-card border border-border rounded-lg shadow-xl py-1 min-w-[120px] max-h-[200px] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  unstyled
                  className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center justify-between"
                  onClick={() => { onCategoryChange(null); setIsCategoryOpen(false); }}
                >
                  미분류
                  {!data.category_id && <Check size={12} className="text-accent" />}
                </Button>
                {categories.map((cat) => (
                  <Button
                    unstyled
                    key={cat.id}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover flex items-center justify-between"
                    onClick={() => { onCategoryChange(cat.id); setIsCategoryOpen(false); }}
                  >
                    {cat.name}
                    {data.category_id === cat.id && <Check size={12} className="text-accent" />}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 flex items-center justify-between px-3 py-1 min-w-0">
            <span className="text-text-tertiary select-none shrink-0">별점</span>
            {data.rating ? (
              <span className="text-text-secondary font-medium ml-2">{data.rating}점</span>
            ) : (
              <span className="text-text-tertiary text-xs ml-2">-</span>
            )}
          </div>
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
