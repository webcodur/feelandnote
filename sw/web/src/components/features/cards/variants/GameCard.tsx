"use client";

import { Gamepad2, Trophy } from "lucide-react";
import {
  BaseCardProps,
  useCardNavigation,
  formatDate,
  StatusBadge,
  DeleteButton,
  CardWrapper,
  CardInfo,
} from "../base/BaseCard";

export default function GameCard({
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
      {/* 게임 케이스 컨테이너 */}
      <div className="relative h-full">
        {/* 네온 글로우 효과 */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-cyan-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-75 blur transition-opacity duration-500" />

        {/* 메인 케이스 */}
        <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-xl overflow-hidden border-2 border-zinc-700 group-hover:border-cyan-500/50 transition-colors duration-300 h-full flex flex-col">
          {/* 케이스 상단 하이라이트 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          {/* 썸네일 영역 - 2:3 비율 */}
          <div className="relative aspect-[2/3] overflow-hidden flex-shrink-0">
            {content.thumbnail_url ? (
              <img
                src={content.thumbnail_url}
                alt={content.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-zinc-900 flex items-center justify-center">
                <Gamepad2 size={40} className="text-purple-500/50" />
              </div>
            )}

            {/* 스캔라인 효과 */}
            <div
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
              }}
            />

            {/* 완료 시 트로피 표시 */}
            {item.status === "COMPLETE" && (
              <div className="absolute top-2 left-2 p-1.5 bg-yellow-500/90 rounded-lg">
                <Trophy size={12} className="text-yellow-900" />
              </div>
            )}

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

            {/* 하단 그라데이션 */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-900 to-transparent" />
          </div>

          {/* 케이스 중간 하이라이트 라인 */}
          <div className="h-0.5 bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500 flex-shrink-0" />

          {/* 정보 영역 */}
          <div className="flex-grow">
            <CardInfo
              title={content.title}
              creator={content.creator}
              addedDate={addedDate}
              progressPercent={progressPercent}
              accentColor="text-cyan-400"
              onProgressChange={(value) => onProgressChange?.(item.id, value)}
            />
          </div>

          {/* 케이스 하단 하이라이트 */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </div>
    </CardWrapper>
  );
}
