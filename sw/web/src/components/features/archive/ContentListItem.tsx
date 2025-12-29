"use client";

import { useRouter } from "next/navigation";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { Book, Film, Gamepad2, Music, Award, Trash2, Check } from "lucide-react";
import { ProgressSlider, DropdownMenu } from "@/components/ui";
import Button from "@/components/ui/Button";

interface ContentListItemProps {
  item: UserContentWithContent;
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  BOOK: { label: "도서", icon: Book },
  VIDEO: { label: "영상", icon: Film },
  GAME: { label: "게임", icon: Gamepad2 },
  MUSIC: { label: "음악", icon: Music },
  CERTIFICATE: { label: "자격증", icon: Award },
};

// 그리드 뷰와 동일한 상태 스타일
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

export default function ContentListItem({ item, onProgressChange, onStatusChange, onDelete, href, compact = false }: ContentListItemProps) {
  const router = useRouter();
  const content = item.content;
  const typeConfig = TYPE_CONFIG[content.type] || { label: content.type, icon: Book };
  const Icon = typeConfig.icon;
  const progressPercent = item.progress ?? 0;
  const addedDate = formatDate(item.created_at);
  const status = item.status ? statusStyles[item.status as keyof typeof statusStyles] : null;

  const handleClick = () => {
    if (href) router.push(href);
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onStatusChange || item.status === "COMPLETE") return;

    if (item.status === "EXPERIENCE" && progressPercent > 0) {
      if (confirm(`진행도 ${progressPercent}%가 초기화됩니다. 계속할까요?`)) {
        onProgressChange?.(item.id, 0);
        onStatusChange(item.id, "WISH");
      }
      return;
    }
    onStatusChange(item.id, item.status === "WISH" ? "EXPERIENCE" : "WISH");
  };

  const canToggleStatus = progressPercent === 0 && onStatusChange && item.status !== "COMPLETE";

  return (
    <div
      className={`group grid items-center gap-3 bg-bg-card rounded-lg border border-border/40 hover:border-border hover:bg-bg-secondary transition-colors cursor-pointer ${
        compact ? "grid-cols-[40px_1fr_48px_64px_56px_100px_28px] py-2 px-3" : "grid-cols-[48px_1fr_48px_72px_64px_140px_32px] py-3 px-4"
      }`}
      onClick={handleClick}
    >
      {/* 썸네일 */}
      <div className={`relative rounded overflow-hidden bg-bg-secondary ${compact ? "w-10 h-14" : "w-12 h-16"}`}>
        {content.thumbnail_url ? (
          <img src={content.thumbnail_url} alt={content.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={compact ? 16 : 20} className="text-text-secondary" />
          </div>
        )}
        {/* 완료 시 체크 오버레이 */}
        {item.status === "COMPLETE" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Check size={compact ? 16 : 20} className="text-green-400" />
          </div>
        )}
      </div>

      {/* 제목 + 작가 */}
      <div className="min-w-0">
        <p className={`font-semibold text-text-primary truncate ${compact ? "text-sm" : "text-sm"}`}>
          {content.title}
        </p>
        {content.creator && (
          <p className={`text-text-secondary truncate ${compact ? "text-[10px]" : "text-xs"}`}>
            {content.creator}
          </p>
        )}
      </div>

      {/* 타입 */}
      <div className={`text-text-secondary text-center ${compact ? "text-[10px]" : "text-xs"}`}>
        {typeConfig.label}
      </div>

      {/* 상태 - 그리드와 동일한 스타일 */}
      <div className="flex justify-center">
        {status && (
          <Button
            unstyled
            className={`px-2 py-0.5 rounded text-center font-bold bg-black/50 border ${status.class} ${compact ? "text-[10px]" : "text-[11px]"} ${
              canToggleStatus ? "hover:opacity-80" : "cursor-default"
            }`}
            onClick={handleStatusClick}
          >
            {status.text}
          </Button>
        )}
      </div>

      {/* 등록일 */}
      <div className={`text-text-secondary text-center ${compact ? "text-[10px]" : "text-xs"}`}>
        {addedDate}
      </div>

      {/* 진행도 */}
      <div
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="flex-1">
          <ProgressSlider
            value={progressPercent}
            onChange={(value) => onProgressChange?.(item.id, value)}
            height={compact ? "sm" : "md"}
          />
        </div>
        <span className={`font-medium text-text-secondary w-8 text-right ${compact ? "text-[10px]" : "text-xs"}`}>
          {progressPercent}%
        </span>
      </div>

      {/* 메뉴 */}
      <div className="flex justify-center">
        {onDelete && (
          <DropdownMenu
            items={[
              {
                label: "삭제",
                icon: <Trash2 size={compact ? 12 : 14} />,
                variant: "danger",
                onClick: () => {
                  if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
                    onDelete(item.id);
                  }
                },
              },
            ]}
            iconSize={compact ? 14 : 16}
          />
        )}
      </div>
    </div>
  );
}
