"use client";

import { ArrowLeft, Book, Film, Tv, Gamepad2, Music, Trash2 } from "lucide-react";
import type { ContentStatus } from "@/actions/contents/addContent";
import type { UserContentWithDetails } from "@/actions/contents/getContent";
import Button from "@/components/ui/Button";

const CATEGORY_LABELS: Record<string, string> = {
  book: "도서", movie: "영화", drama: "드라마", animation: "애니메이션", game: "게임",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  book: Book, movie: Film, drama: Tv, animation: Music, game: Gamepad2,
};

interface ArchiveDetailHeaderProps {
  item: UserContentWithDetails;
  isSaving: boolean;
  onStatusChange: (status: ContentStatus) => void;
  onProgressChange: (progress: number) => void;
  onDelete: () => void;
}

export default function ArchiveDetailHeader({
  item,
  isSaving,
  onStatusChange,
  onProgressChange,
  onDelete,
}: ArchiveDetailHeaderProps) {
  const content = item.content;
  const categoryLabel = CATEGORY_LABELS[content.type.toLowerCase()] || content.type;
  const Icon = CATEGORY_ICONS[content.type.toLowerCase()] || Book;

  return (
    <>
      <Button
        unstyled
        className="flex items-center gap-1 text-text-secondary text-sm mb-3 hover:text-text-primary"
        onClick={() => window.history.back()}
      >
        <ArrowLeft size={16} />
        <span>뒤로</span>
      </Button>

      <div className="flex flex-col sm:flex-row gap-4 pb-4 mb-4 border-b border-border">
        <div className="flex gap-3 sm:gap-4">
          <div className="w-16 h-24 sm:w-20 sm:h-[120px] rounded-lg shadow-lg shrink-0 overflow-hidden">
            {content.thumbnail_url ? (
              <img src={content.thumbnail_url} alt={content.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <Icon size={24} className="text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="py-0.5 px-2 bg-white/10 rounded text-[10px] font-medium text-text-secondary flex items-center gap-1">
                <Icon size={12} /> {categoryLabel}
              </span>
              <select
                className="bg-bg-secondary border border-border text-text-primary py-0.5 px-1.5 rounded text-[10px] cursor-pointer outline-none disabled:opacity-50"
                value={item.status}
                onChange={(e) => onStatusChange(e.target.value as ContentStatus)}
                disabled={isSaving || ((item.progress ?? 0) > 0 && item.status !== 'COMPLETE')}
              >
                <option value="EXPERIENCE">감상 중</option>
                <option value="WISH">관심</option>
                <option value="COMPLETE">완료</option>
              </select>
            </div>
            <h1 className="text-lg sm:text-xl font-bold leading-tight truncate mb-1">{content.title}</h1>
            <div className="text-xs sm:text-sm text-text-secondary truncate">
              {content.creator}
              {(content.metadata as { genre?: string })?.genre && ` · ${(content.metadata as { genre?: string }).genre}`}
            </div>
          </div>
          <Button
            unstyled
            onClick={onDelete}
            className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded self-start sm:hidden"
            title="삭제"
          >
            <Trash2 size={16} />
          </Button>
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <div className="relative flex-1 sm:w-32 group">
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={item.progress ?? 0}
                onChange={(e) => onProgressChange(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer transition-all hover:bg-white/15
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-grab
                  [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-125
                  [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-accent [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-grab"
                style={{
                  background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${item.progress ?? 0}%, rgba(255,255,255,0.1) ${item.progress ?? 0}%, rgba(255,255,255,0.1) 100%)`,
                }}
              />
            </div>
            <span className="text-xs font-semibold text-accent w-8">{item.progress ?? 0}%</span>
            <Button
              unstyled
              onClick={() => onProgressChange(Math.min(100, (item.progress ?? 0) + 10))}
              className="text-[10px] py-1 px-2 bg-white/5 hover:bg-accent/20 text-text-secondary hover:text-accent rounded whitespace-nowrap"
            >
              +10%
            </Button>
          </div>
          <Button
            unstyled
            onClick={onDelete}
            className="hidden sm:block p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded"
            title="삭제"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
    </>
  );
}
