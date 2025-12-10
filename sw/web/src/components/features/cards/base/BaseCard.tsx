"use client";

import { useRouter } from "next/navigation";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { Trash2 } from "lucide-react";
import { ProgressSlider } from "@/components/ui";

export interface BaseCardProps {
  item: UserContentWithContent;
  onProgressChange?: (userContentId: string, progress: number) => void;
  onStatusChange?: (userContentId: string, status: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
  onDelete?: (userContentId: string) => void;
  href?: string;
  compact?: boolean;
}

// 카드 래퍼 - 모든 카드의 외부 컨테이너 (크기 통일)
interface CardWrapperProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export function CardWrapper({ children, onClick, className = "" }: CardWrapperProps) {
  return (
    <div
      className={`group cursor-pointer transition-all duration-300 hover:-translate-y-1 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// 카드 정보 영역 - 모든 카드에 공통으로 사용
interface CardInfoProps {
  title: string;
  creator?: string | null;
  addedDate: string;
  progressPercent: number;
  accentColor: string;
  onProgressChange?: (value: number) => void;
}

export function CardInfo({
  title,
  creator,
  addedDate,
  progressPercent,
  accentColor,
  onProgressChange,
}: CardInfoProps) {
  return (
    <div className="p-3 bg-bg-card">
      <div className="font-semibold text-sm mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {title}
      </div>
      {creator && (
        <div className="text-xs text-text-secondary mb-2 truncate h-4">
          {creator}
        </div>
      )}
      {!creator && <div className="h-4 mb-2" />}

      {onProgressChange && (
        <div
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <ProgressSlider
            value={progressPercent}
            onChange={onProgressChange}
          />
        </div>
      )}
      {!onProgressChange && (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="flex justify-between text-xs text-text-secondary mt-2">
        <span>{addedDate}</span>
        <span className={`font-medium ${accentColor}`}>{progressPercent}%</span>
      </div>
    </div>
  );
}

export const statusStyles = {
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

export function useCardNavigation(href?: string) {
  const router = useRouter();
  return () => {
    if (href) router.push(href);
  };
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getStatusText(status: string | null, progress: number) {
  if (status === "EXPERIENCE") return "감상 중";
  if (status === "COMPLETE") return "완료";
  return statusStyles[status as keyof typeof statusStyles]?.text || "";
}

interface StatusBadgeProps {
  status: string;
  progress: number;
  onStatusChange?: (newStatus: "WISH" | "EXPERIENCE" | "COMPLETE") => void;
}

export function StatusBadge({ status, progress, onStatusChange }: StatusBadgeProps) {
  const style = statusStyles[status as keyof typeof statusStyles];
  if (!style) return null;

  const statusText = getStatusText(status, progress);
  const canToggle = progress === 0 && onStatusChange && status !== "COMPLETE";

  return (
    <button
      className={`absolute top-2 right-2 py-1 px-2 rounded-md text-[11px] font-bold bg-black/70 backdrop-blur-sm ${style.class} ${
        canToggle ? "hover:opacity-80 cursor-pointer" : "cursor-default"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        if (canToggle) {
          const newStatus = status === "WISH" ? "EXPERIENCE" : "WISH";
          onStatusChange(newStatus);
        }
      }}
    >
      {statusText}
    </button>
  );
}

interface DeleteButtonProps {
  onDelete: () => void;
}

export function DeleteButton({ onDelete }: DeleteButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("이 콘텐츠를 삭제하시겠습니까?")) {
          onDelete();
        }
      }}
      className="absolute bottom-2 right-2 p-1.5 bg-black/70 backdrop-blur-sm rounded-md text-text-secondary hover:text-red-400 hover:bg-red-400/20 transition-colors opacity-0 group-hover:opacity-100"
      title="삭제"
    >
      <Trash2 size={14} />
    </button>
  );
}

interface TypeLabelProps {
  label: string;
}

export function TypeLabel({ label }: TypeLabelProps) {
  return (
    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm py-1 px-2 rounded-md text-[11px] font-semibold text-white">
      {label}
    </div>
  );
}
