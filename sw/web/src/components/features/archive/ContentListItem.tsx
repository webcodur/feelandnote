"use client";

import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { Book, Film, Trash2 } from "lucide-react";
import { ProgressSlider } from "@/components/ui";

interface ContentListItemProps {
  item: UserContentWithContent;
  onProgressChange?: (userContentId: string, progress: number) => void;
  onDelete?: (userContentId: string) => void;
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
    text: "경험",
  },
  WISH: {
    class: "text-yellow-300 border border-yellow-600",
    text: "관심",
  },
};

export default function ContentListItem({ item, onProgressChange, onDelete }: ContentListItemProps) {
  const content = item.content;
  const status = item.status ? statusStyles[item.status as keyof typeof statusStyles] : null;
  const statusText =
    item.status === "EXPERIENCE"
      ? content.type === "BOOK"
        ? "읽음"
        : "봄"
      : status?.text || "";

  const progressPercent = item.progress ?? 0;
  const typeLabel = TYPE_LABELS[content.type] || content.type;
  const Icon = TYPE_ICONS[content.type] || Book;

  const addedDate = new Date(item.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="group bg-bg-card rounded-lg p-4 flex gap-4 items-center transition-all duration-200 cursor-pointer border border-transparent hover:border-border hover:bg-bg-secondary">
      {/* Thumbnail */}
      <div className="w-16 h-24 flex-shrink-0 rounded-md overflow-hidden bg-[#2a3038]">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <Icon size={24} className="text-gray-500" />
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-0.5 rounded">
            {typeLabel}
          </span>
          {status && (
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${status.class}`}>
              {statusText}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-text-primary truncate mb-1">
          {content.title}
        </h3>
        {content.creator && (
          <p className="text-sm text-text-secondary truncate">{content.creator}</p>
        )}
      </div>

      {/* Progress & Date */}
      <div className="flex-shrink-0 text-right">
        <div className="text-sm text-text-secondary mb-2">{addedDate}</div>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.preventDefault()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="w-24">
            <ProgressSlider
              value={progressPercent}
              onChange={(value) => onProgressChange?.(item.id, value)}
              height="md"
            />
          </div>
          <span className="text-xs text-text-secondary w-10 text-right">
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
          className="flex-shrink-0 p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="삭제"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
