"use client";

import { Film, Play } from "lucide-react";
import {
  BaseCardProps,
  useCardNavigation,
  formatDate,
  StatusBadge,
  DeleteButton,
  CardWrapper,
  CardInfo,
} from "../base/BaseCard";

export default function VideoCard({
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
        {/* 필름 스트립 */}
        <div className="bg-zinc-900 rounded-lg overflow-hidden shadow-xl flex-shrink-0">
          {/* 상단 필름 구멍 */}
          <div className="flex justify-around items-center h-3 bg-zinc-950 px-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-[2px] bg-zinc-800 border border-zinc-700"
              />
            ))}
          </div>

          {/* 필름 프레임 */}
          <div className="p-1 bg-zinc-900">
            <div className="relative aspect-[2/3] overflow-hidden rounded-sm bg-zinc-800">
              {content.thumbnail_url ? (
                <img
                  src={content.thumbnail_url}
                  alt={content.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                  <Film size={40} className="text-zinc-600" />
                </div>
              )}

              {/* 재생 버튼 오버레이 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/60 transition-transform duration-300 group-hover:scale-110">
                  <Play size={24} className="text-white ml-1" fill="white" />
                </div>
              </div>

              {/* 필름 그레인 효과 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 pointer-events-none" />

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

          {/* 하단 필름 구멍 */}
          <div className="flex justify-around items-center h-3 bg-zinc-950 px-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-[2px] bg-zinc-800 border border-zinc-700"
              />
            ))}
          </div>
        </div>

        {/* 정보 영역 */}
        <div className="flex-grow bg-bg-card rounded-lg mt-2">
          <CardInfo
            title={content.title}
            creator={content.creator}
            addedDate={addedDate}
            progressPercent={progressPercent}
            accentColor="text-red-400"
            onProgressChange={(value) => onProgressChange?.(item.id, value)}
          />
        </div>
      </div>
    </CardWrapper>
  );
}
