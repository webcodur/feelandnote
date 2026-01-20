/*
  파일명: /components/features/user/RecordInfoPanel.tsx
  기능: 기록 정보 패널 (편집/읽기 전용 모드 지원)
  책임: 시작/종료, 상태, 분류/별점을 표시하고 편집 모드에서는 수정 가능하게 한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { FolderOpen, Check, Eye, Globe, Users, Lock } from "lucide-react";
import Button from "@/components/ui/Button";
import { STATUS_STYLES } from "@/constants/statuses";
import type { VisibilityType } from "@/types/database";

// Re-export for backward compatibility
export { STATUS_STYLES };

// #region 상수

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
}

interface RecordInfoPanelProps {
  data: RecordData;
  editable?: boolean;
  showReview?: boolean;
  fillHeight?: boolean;
  onDateEdit?: () => void;
  onStatusClick?: () => void;
  onVisibilityChange?: (visibility: VisibilityType) => void;
  canToggleStatus?: boolean;
}
// #endregion

export default function RecordInfoPanel({
  data,
  editable = false,
  showReview = false,
  fillHeight = false,
  onDateEdit,
  onStatusClick,
  onVisibilityChange,
  canToggleStatus = false,
}: RecordInfoPanelProps) {
  const [isVisibilityOpen, setIsVisibilityOpen] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(false);

  const addedDate = formatDate(data.created_at);
  const completedDate = data.completed_at ? formatDate(data.completed_at) : null;

  // 상태 스타일 결정
  const status = STATUS_STYLES[data.status] || STATUS_STYLES.WANT;

  return (
    <div className={`@container flex flex-col gap-1.5 text-xs ${fillHeight ? "h-full" : ""}`}>
      {/* 3 Rows x 2 Columns Grid Layout */}
      <div className="flex flex-col border border-accent-dim/30 rounded-sm divide-y divide-accent-dim/30 text-xs bg-bg-main/50 font-serif">
        {/* Row 1: 시작 | 종료 */}
        <div className="flex-1 flex divide-x divide-accent-dim/30 overflow-hidden">
          <div className="flex-1 flex items-center justify-between px-3 py-1.5 min-w-0">
            <span className="text-text-tertiary select-none shrink-0 text-[10px] uppercase tracking-wider">Start</span>
            {editable && onDateEdit ? (
              <Button
                unstyled
                className="text-text-primary hover:text-accent hover:underline truncate text-right ml-2 font-cinzel font-bold text-[11px]"
                onClick={(e) => { e.stopPropagation(); onDateEdit(); }}
              >
                {addedDate}
              </Button>
            ) : (
              <span className="text-text-secondary truncate text-right ml-2 font-cinzel text-[11px]">{addedDate}</span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-between px-3 py-1.5 min-w-0">
            <span className="text-text-tertiary select-none shrink-0 text-[10px] uppercase tracking-wider">End</span>
            {editable && onDateEdit ? (
              <Button
                unstyled
                className="text-text-primary hover:text-accent hover:underline truncate text-right ml-2 font-cinzel font-bold text-[11px]"
                onClick={(e) => { e.stopPropagation(); onDateEdit(); }}
              >
                {completedDate || "-"}
              </Button>
            ) : (
              <span className="text-text-secondary truncate text-right ml-2 font-cinzel text-[11px]">{completedDate || "-"}</span>
            )}
          </div>
        </div>

        {/* Row 2: 상태 | 공개 */}
        <div className="flex-1 flex divide-x divide-accent-dim/30 overflow-visible relative z-10">
          <div className="flex-1 flex items-center justify-between px-3 py-1.5 min-w-0">
            <span className="text-text-tertiary select-none shrink-0 text-[10px] uppercase tracking-wider">Status</span>
            {status && (
              <Button
                unstyled
                className={`${status.class} ${editable && canToggleStatus ? "hover:bg-accent/5" : "cursor-default"} text-[10px] px-2 py-0.5 rounded-sm flex items-center font-bold font-serif truncate ml-2 transition-colors`}
                onClick={editable && onStatusClick ? (e) => { e.stopPropagation(); onStatusClick(); } : undefined}
              >
                {status.text}
              </Button>
            )}
          </div>
          <div className="flex-1 flex items-center justify-between px-3 py-1.5 min-w-0 relative">
            <span className="text-text-tertiary select-none shrink-0 text-[10px] uppercase tracking-wider">Public</span>
            {(() => {
              const currentVisibility = VISIBILITY_OPTIONS.find(v => v.value === (data.visibility ?? "public")) ?? VISIBILITY_OPTIONS[0];
              const Icon = currentVisibility.icon;
              return editable && onVisibilityChange ? (
                <>
                  <Button
                    unstyled
                    className={`${currentVisibility.class} hover:bg-accent/5 text-[10px] flex items-center gap-1 font-bold font-serif truncate ml-2 transition-colors rounded-sm px-1`}
                    onClick={(e) => { e.stopPropagation(); setIsVisibilityOpen(!isVisibilityOpen); }}
                  >
                    <Icon size={12} />
                    {currentVisibility.label}
                  </Button>
                  {isVisibilityOpen && (
                    <div
                      className="absolute top-8 right-0 w-[120px] z-50 bg-bg-card border border-accent-dim/30 rounded-sm shadow-xl py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {VISIBILITY_OPTIONS.map((opt) => {
                        const OptIcon = opt.icon;
                        return (
                          <Button
                            unstyled
                            key={opt.value}
                            className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent/10 flex items-center justify-between gap-2 font-serif"
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
                <span className={`${currentVisibility.class} text-[10px] flex items-center gap-1 truncate ml-2 font-bold font-serif`}>
                  <Icon size={12} />
                  {currentVisibility.label}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Row 3: 별점 (분류 제거됨) */}
        <div className="flex-1 flex divide-x divide-accent-dim/30 overflow-visible relative z-0">
          <div className="flex-1 flex items-center justify-between px-3 py-1.5 min-w-0">
            <span className="text-text-tertiary select-none shrink-0 text-[10px] uppercase tracking-wider">Rating</span>
            {data.rating ? (
              <span className="text-accent font-bold font-cinzel ml-2">{data.rating} <span className="text-[10px] text-text-tertiary">/ 5</span></span>
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
