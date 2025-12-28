"use client";

import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { ProgressSlider } from "@/components/ui";

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
  const content = item.content;
  const progressPercent = item.progress ?? 0;
  const addedDate = formatDate(item.created_at);

  const handleClick = () => {
    if (href) router.push(href);
  };

  return (
    <div
      className="group cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative rounded-xl overflow-hidden shadow-xl h-full flex flex-col bg-bg-card">
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
          {item.status && item.status !== "COMPLETE" && (
            <StatusBadge
              status={item.status}
              progress={progressPercent}
              onStatusChange={onStatusChange ? (s) => onStatusChange(item.id, s) : undefined}
            />
          )}

          {/* 완료 스탬프 */}
          {item.status === "COMPLETE" && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] z-20 pointer-events-none">
              <div className="px-3 py-1.5 border-2 border-green-500 rounded-lg bg-green-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  <Check size={16} className="text-green-400" />
                  <span className="text-green-400 font-bold text-sm tracking-wider">COMPLETE</span>
                </div>
              </div>
            </div>
          )}

          {/* 삭제 버튼 */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
                  onDelete(item.id);
                }
              }}
              className="absolute bottom-2 right-2 z-20 p-1.5 bg-black/70 backdrop-blur-sm rounded-md text-text-secondary hover:text-red-400 hover:bg-red-400/20 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* 정보 영역 */}
        <div className="p-2 sm:p-3 flex-grow">
          <div className="font-semibold text-xs sm:text-sm mb-1 truncate">{content.title}</div>
          <div className="text-[10px] sm:text-xs text-text-secondary mb-2 truncate h-4">
            {content.creator || ""}
          </div>

          {/* 진행률 */}
          {onProgressChange ? (
            <div onClick={(e) => e.stopPropagation()}>
              <ProgressSlider
                value={progressPercent}
                onChange={(v) => onProgressChange(item.id, v)}
              />
            </div>
          ) : (
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          <div className="flex justify-between text-xs text-text-secondary mt-2">
            <span>{addedDate}</span>
            <span className="font-medium text-primary">{progressPercent}%</span>
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
    <button
      className={`absolute top-2 right-2 z-20 py-1 px-2 rounded-md text-[11px] font-bold bg-black/70 backdrop-blur-sm border ${style.class} ${
        canToggle ? "hover:opacity-80 cursor-pointer" : "cursor-default"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (canToggle) {
          onStatusChange(status === "WISH" ? "EXPERIENCE" : "WISH");
        }
      }}
    >
      {style.text}
    </button>
  );
}
