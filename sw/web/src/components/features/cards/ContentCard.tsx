"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { ProgressSlider, DropdownMenu, type DropdownMenuItem } from "@/components/ui";
import Button from "@/components/ui/Button";

export interface ContentCardProps {
  item: UserContentWithContent;
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
}

const statusStyles = {
  EXPERIENCE: { class: "text-green-400 border-green-600", text: "감상 중" },
  WISH: { class: "text-yellow-300 border-yellow-600", text: "관심" },
  COMPLETE: { class: "text-blue-400 border-blue-600", text: "완료" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

export default function ContentCard({
  item,
  onProgressChange,
  onStatusChange,
  onDelete,
  href,
  compact: _compact,
}: ContentCardProps) {
  const router = useRouter();
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const content = item.content;
  const progressPercent = item.progress ?? 0;
  const addedDate = formatDate(item.created_at);

  const handleClick = () => {
    if (href) router.push(href);
  };

  const handleProgressChange = (value: number) => {
    onProgressChange?.(item.id, value);
    setIsEditingProgress(false);
  };

  return (
    <div
      className="group cursor-pointer relative"
      onClick={handleClick}
    >
      {/* 더보기 메뉴 - 카드 최상위에 배치 */}
      {onDelete && (
        <div className="absolute top-2 right-2 z-30">
          <DropdownMenu
            items={[
              {
                label: "삭제",
                icon: <Trash2 size={14} />,
                variant: "danger",
                onClick: () => {
                  if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
                    onDelete(item.id);
                  }
                },
              },
            ]}
            buttonClassName="bg-black/60 backdrop-blur-sm text-white hover:text-white hover:bg-black/80"
            iconSize={16}
          />
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden shadow-xl h-full flex flex-col bg-bg-card z-10">
        {/* 썸네일 영역 */}
        <div className="relative w-full aspect-[3/4] overflow-hidden flex-shrink-0 bg-gray-800">
          {content.thumbnail_url ? (
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700 text-gray-400">
              <span className="text-xs">No Image</span>
            </div>
          )}

          {/* 그라데이션 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

          {/* 상태 배지 */}
          {item.status && (
            <StatusBadge
              status={item.status}
              progress={progressPercent}
              onStatusChange={onStatusChange ? (s) => onStatusChange(item.id, s) : undefined}
            />
          )}
        </div>

        {/* 정보 영역 */}
        <div className="p-2 sm:p-3 flex-grow">
          <div className="font-semibold text-xs sm:text-sm mb-1 truncate">{content.title}</div>
          <div className="text-[10px] sm:text-xs text-text-secondary mb-2 truncate h-4">
            {content.creator || ""}
          </div>

          {/* 진행률 */}
          {isEditingProgress && onProgressChange ? (
            <div onClick={(e) => e.stopPropagation()}>
              <ProgressSlider
                value={progressPercent}
                onChange={handleProgressChange}
              />
            </div>
          ) : (
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          <div className="flex justify-between text-xs text-text-secondary mt-2">
            <span>{addedDate}</span>
            {onProgressChange ? (
              <button
                type="button"
                className="font-medium text-primary hover:text-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingProgress(!isEditingProgress);
                }}
              >
                {progressPercent}%
              </button>
            ) : (
              <span className="font-medium text-primary">{progressPercent}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  progress,
  onStatusChange,
}: {
  status: string;
  progress: number;
  onStatusChange?: (s: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
}) {
  const style = statusStyles[status as keyof typeof statusStyles];
  if (!style) return null;

  const canToggle = progress === 0 && onStatusChange && status !== "COMPLETE";

  return (
    <Button
      unstyled
      className={`absolute top-2 left-2 z-20 py-1 px-2 rounded-md text-[11px] font-bold bg-black/70 backdrop-blur-sm border ${style.class} ${
        canToggle ? "hover:opacity-80" : "cursor-default"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (canToggle) {
          onStatusChange(status === "WISH" ? "EXPERIENCE" : "WISH");
        }
      }}
    >
      {style.text}
    </Button>
  );
}
