"use client";

import { Drama, Check } from "lucide-react";
import {
  BaseCardProps,
  useCardNavigation,
  formatDate,
  StatusBadge,
  DeleteButton,
  CardWrapper,
  CardInfo,
} from "../base/BaseCard";

export default function PerformanceCard({
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
    <CardWrapper onClick={handleClick} className="hover:rotate-1">
      {/* 티켓 컨테이너 */}
      <div className="relative bg-gradient-to-br from-rose-900/80 to-stone-900 rounded-xl overflow-hidden shadow-xl h-full flex flex-col">
        {/* 티켓 테두리 점선 */}
        <div className="absolute inset-2 border-2 border-dashed border-rose-300/30 rounded-lg pointer-events-none" />

        {/* 티켓 구멍 (좌우) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-bg-main rounded-r-full" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-bg-main rounded-l-full" />

        {/* 포스터 영역 - 2:3 비율 */}
        <div className="relative mx-3 mt-3 aspect-[2/3] overflow-hidden rounded-lg flex-shrink-0">
          {content.thumbnail_url ? (
            <img
              src={content.thumbnail_url}
              alt={content.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-800/50 to-stone-900 flex items-center justify-center">
              <Drama size={40} className="text-rose-400/50" />
            </div>
          )}

          {/* 빈티지 필터 효과 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-amber-100/10 pointer-events-none" />

          {/* 완료 시 ENJOYED 스탬프 */}
          {item.status === "COMPLETE" && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg]">
              <div className="px-3 py-1.5 border-3 border-green-500 rounded-lg bg-green-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  <Check size={16} className="text-green-400" />
                  <span className="text-green-400 font-bold text-sm tracking-wider">ENJOYED</span>
                </div>
              </div>
            </div>
          )}

          {/* 상태 뱃지 */}
          {item.status && item.status !== "COMPLETE" && (
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

        {/* 구분선 */}
        <div className="mx-3 my-2 border-t border-dashed border-rose-300/30 flex-shrink-0" />

        {/* 정보 영역 */}
        <div className="flex-grow">
          <CardInfo
            title={content.title}
            creator={content.creator}
            addedDate={addedDate}
            progressPercent={progressPercent}
            accentColor="text-rose-400"
            onProgressChange={(value) => onProgressChange?.(item.id, value)}
          />
        </div>

        {/* 티켓 하단 장식 */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500/50 via-amber-500/50 to-rose-500/50" />
      </div>
    </CardWrapper>
  );
}
