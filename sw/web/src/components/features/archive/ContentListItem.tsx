"use client";

import { useRouter } from "next/navigation";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { Book, Film, Trash2 } from "lucide-react";
import { ProgressSlider } from "@/components/ui";

interface ContentListItemProps {
  item: UserContentWithContent;
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  BOOK: "도서",
  MOVIE: "영화",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  BOOK: Book,
  MOVIE: Film,
};

const statusStyles = {
  EXPERIENCE: {
    class: "text-green-400 border border-green-600",
    text: "감상 중",
  },
  WISH: {
    class: "text-yellow-300 border border-yellow-600",
    text: "관심",
  },
  COMPLETE: {
    class: "text-blue-400 border border-blue-600",
    text: "완료",
  },
};

export default function ContentListItem({ item, onProgressChange, onStatusChange, onDelete, href, compact = false }: ContentListItemProps) {
  const router = useRouter();
  const content = item.content;
  const status = item.status ? statusStyles[item.status as keyof typeof statusStyles] : null;
  const statusText =
    item.status === "EXPERIENCE"
      ? "감상 중"
      : item.status === "COMPLETE"
        ? "완료"
        : status?.text || "";

  const progressPercent = item.progress ?? 0;
  const typeLabel = TYPE_LABELS[content.type] || content.type;
  const Icon = TYPE_ICONS[content.type] || Book;

  const addedDate = new Date(item.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleClick = () => {
    if (href) {
      router.push(href);
    }
  };

  return (
    <div
      className={`group bg-bg-card rounded-lg flex gap-4 items-center transition-all duration-200 cursor-pointer border border-transparent hover:border-border hover:bg-bg-secondary ${compact ? "p-3" : "p-4"}`}
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className={`flex-shrink-0 rounded-md overflow-hidden bg-[#2a3038] ${compact ? "w-12 h-18" : "w-16 h-24"}`}>
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <Icon size={compact ? 18 : 24} className="text-gray-500" />
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-text-secondary bg-bg-secondary px-2 py-0.5 rounded ${compact ? "text-[10px]" : "text-xs"}`}>
            {typeLabel}
          </span>
          {status && (
            <button
              className={`px-2 py-0.5 rounded font-medium ${status.class} ${compact ? "text-[10px]" : "text-xs"} ${
                onStatusChange && item.status !== "COMPLETE" ? "hover:opacity-80 cursor-pointer" : "cursor-default"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (!onStatusChange || item.status === "COMPLETE") return;

                // 감상 중 → 관심으로 변경 시 진행도가 있으면 확인
                if (item.status === "EXPERIENCE" && progressPercent > 0) {
                  const confirmed = confirm(
                    `현재 진행도가 ${progressPercent}%입니다.\n관심 상태로 변경하면 진행도가 0%로 초기화됩니다.\n계속하시겠습니까?`
                  );
                  if (confirmed) {
                    onProgressChange?.(item.id, 0);
                    onStatusChange(item.id, "WISH");
                  }
                  return;
                }

                // 진행도 0일 때 또는 관심 → 감상중
                const newStatus = item.status === "WISH" ? "EXPERIENCE" : "WISH";
                onStatusChange(item.id, newStatus);
              }}
            >
              {statusText}
            </button>
          )}
        </div>
        <h3 className={`font-semibold text-text-primary truncate mb-1 ${compact ? "text-sm" : ""}`}>
          {content.title}
        </h3>
        {content.creator && (
          <p className={`text-text-secondary truncate ${compact ? "text-xs" : "text-sm"}`}>{content.creator}</p>
        )}
      </div>

      {/* Progress & Date */}
      <div className="flex-shrink-0 text-right">
        <div className={`text-text-secondary mb-2 ${compact ? "text-xs" : "text-sm"}`}>{addedDate}</div>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className={compact ? "w-20" : "w-24"}>
            <ProgressSlider
              value={progressPercent}
              onChange={(value) => onProgressChange?.(item.id, value)}
              height={compact ? "sm" : "md"}
            />
          </div>
          <span className={`text-text-secondary text-right ${compact ? "text-[10px] w-8" : "text-xs w-10"}`}>
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Delete Button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
              onDelete(item.id);
            }
          }}
          className={`flex-shrink-0 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${compact ? "p-1.5" : "p-2"}`}
          title="삭제"
        >
          <Trash2 size={compact ? 14 : 16} />
        </button>
      )}
    </div>
  );
}
