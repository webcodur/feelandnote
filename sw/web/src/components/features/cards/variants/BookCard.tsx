"use client";

import { Book } from "lucide-react";
import {
  BaseCardProps,
  useCardNavigation,
  formatDate,
  StatusBadge,
  DeleteButton,
  CardWrapper,
  CardInfo,
} from "../base/BaseCard";

export default function BookCard({
  item,
  onProgressChange,
  onStatusChange,
  onDelete,
  href,
}: BaseCardProps) {
  const handleClick = useCardNavigation(href);
  const content = item.content;
  const progressPercent = item.progress ?? 0;
  const addedDate = formatDate(item.created_at);

  return (
    <CardWrapper onClick={handleClick}>
      <div className="h-full flex flex-col">
        {/* 책 본체 - 3D 시점 */}
        <div className="relative flex-shrink-0 ml-4">
          {/* 책등 (Spine) - 평행사변형 */}
          <div
            className="absolute right-full top-0 w-4 z-20"
            style={{
              height: "calc(100% + 16px)",
              background: "linear-gradient(to right, #6b4010 0%, #855215 40%, #9a5f18 70%, #a8691c 100%)",
              transform: "skewY(-8deg)",
              transformOrigin: "bottom right",
              borderRadius: "2px 0 0 2px",
            }}
          >
            {/* 책등 하이라이트 */}
            <div
              className="absolute inset-0 rounded-l-[2px]"
              style={{
                background: "linear-gradient(to right, rgba(255,255,255,0.15) 0%, transparent 50%)",
              }}
            />
            {/* 세로 홈 */}
            <div className="absolute left-1.5 top-3 bottom-3 w-px bg-black/15" />
          </div>

          {/* 표지 */}
          <div className="relative z-10">
            <div className="relative aspect-[2/3] rounded-r-md overflow-hidden bg-stone-800">
              {content.thumbnail_url ? (
                <img
                  src={content.thumbnail_url}
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-900 to-stone-900 flex items-center justify-center">
                  <Book size={40} className="text-amber-600/50" />
                </div>
              )}

              {/* 표지 광택 */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none" />

              {/* 상태 뱃지 */}
              {item.status && (
                <StatusBadge
                  status={item.status}
                  progress={progressPercent}
                  onStatusChange={
                    onStatusChange
                      ? (newStatus) => onStatusChange(item.id, newStatus)
                      : undefined
                  }
                />
              )}

              {/* 삭제 버튼 */}
              {onDelete && <DeleteButton onDelete={() => onDelete(item.id)} />}
            </div>
          </div>

          {/* 페이지 (하단) - 평행사변형 */}
          <div
            className="absolute left-0 right-0 h-4 z-0"
            style={{
              top: "100%",
              background: "linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 30%, #c8c8c8 70%, #b0b0b0 100%)",
              transform: "skewX(-8deg)",
              transformOrigin: "top right",
              borderRadius: "0 0 2px 2px",
            }}
          >
            {/* 페이지 라인 */}
            <div className="absolute inset-x-2 top-[3px] h-px bg-gray-400/40" />
            <div className="absolute inset-x-2 top-[7px] h-px bg-gray-400/30" />
            <div className="absolute inset-x-2 top-[11px] h-px bg-gray-400/20" />
          </div>
        </div>

        {/* 하단 여백 (페이지 공간) */}
        <div className="h-5 flex-shrink-0" />

        {/* 정보 영역 */}
        <div className="flex-grow bg-bg-card rounded-lg">
          <CardInfo
            title={content.title}
            creator={content.creator}
            addedDate={addedDate}
            progressPercent={progressPercent}
            accentColor="text-amber-500"
            onProgressChange={(value) => onProgressChange?.(item.id, value)}
          />
        </div>
      </div>
    </CardWrapper>
  );
}
