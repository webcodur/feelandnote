"use client";

import { useRouter } from "next/navigation";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { Book, Film, Trash2 } from "lucide-react";
import { ProgressSlider } from "@/components/ui";

interface ContentCardProps {
  item: UserContentWithContent;
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
}

type TypeLabels = { [key: string]: string };
type TypeIcons = { [key: string]: React.ElementType };

const TYPE_LABELS: TypeLabels = {
  BOOK: "도서",
  MOVIE: "영화",
};

const TYPE_ICONS: TypeIcons = {
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

export default function ContentCard({ item, onProgressChange, onStatusChange, onDelete, href, compact = false }: ContentCardProps) {
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

  const handleCardClick = () => {
    if (href) {
      router.push(href);
    }
  };

  return (
    <div
      className="group bg-bg-card rounded-xl overflow-hidden transition-all duration-200 cursor-pointer border border-transparent relative hover:-translate-y-1 hover:shadow-2xl hover:border-border"
      onClick={handleCardClick}
    >
      <div className="w-full aspect-[2/3] bg-[#2a3038] relative overflow-hidden">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <Icon size={48} className="text-gray-500" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm py-1 px-2 rounded-md text-[11px] font-semibold text-white">
          {typeLabel}
        </div>
        {status && (
          <button
            className={`absolute top-2 right-2 py-1 px-2 rounded-md text-[11px] font-bold bg-black/70 backdrop-blur-sm ${status.class} ${
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
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
                onDelete(item.id);
              }
            }}
            className="absolute bottom-2 right-2 p-1.5 bg-black/70 backdrop-blur-sm rounded-md text-text-secondary hover:text-red-400 hover:bg-red-400/20 transition-colors opacity-0 group-hover:opacity-100"
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="p-3">
        <div className="font-semibold text-sm mb-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          {content.title}
        </div>
        {content.creator && (
          <div className="text-xs text-text-secondary mb-2 truncate">{content.creator}</div>
        )}
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
        >
          <ProgressSlider
            value={progressPercent}
            onChange={(value) => onProgressChange?.(item.id, value)}
          />
        </div>
        <div className="flex justify-between text-xs text-text-secondary mt-2">
          <span>{addedDate}</span>
          <span>{progressPercent}%</span>
        </div>
      </div>
    </div>
  );
}
