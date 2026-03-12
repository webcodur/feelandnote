/*
  파일명: /components/features/user/explore/hub/TopByTypeGrid.tsx
  기능: 분야별 최다 기록가 그리드
  책임: 4컬럼(모바일 2x2) 균등 배치, 각 카드에 타입 라벨 표시
*/ // ------------------------------

"use client";

import CelebCard from "@/components/shared/CelebCard";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import { Book, Film, Gamepad2, Music } from "lucide-react";
import { useLocale } from "next-intl";
import type { TopByTypeEntry } from "@/actions/home/getTopByContentType";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; badgeBg: string; badgeShadow: string }> = {
  BOOK: { icon: Book, color: "text-blue-400", badgeBg: "bg-blue-500", badgeShadow: "shadow-blue-500/40" },
  VIDEO: { icon: Film, color: "text-red-400", badgeBg: "bg-red-500", badgeShadow: "shadow-red-500/40" },
  GAME: { icon: Gamepad2, color: "text-green-400", badgeBg: "bg-green-500", badgeShadow: "shadow-green-500/40" },
  MUSIC: { icon: Music, color: "text-purple-400", badgeBg: "bg-purple-500", badgeShadow: "shadow-purple-500/40" },
};

interface TopByTypeGridProps {
  entries: TopByTypeEntry[];
}

export default function TopByTypeGrid({ entries }: TopByTypeGridProps) {
  const locale = useLocale();
  const { handleSubtitle } = useDialogueSubtitle();

  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 max-w-3xl mx-auto">
      {entries.map((entry) => {
        const config = TYPE_CONFIG[entry.type];
        const Icon = config.icon;
        const label = locale === "en" ? entry.label.en : entry.label.ko;
        const typeCount = entry.celeb.content_count ?? 0;

        return (
          <div key={entry.type} className="flex flex-col items-center gap-2">
            {/* 셀럽 카드 (기본 뱃지 숨김) + 타입별 커스텀 뱃지 */}
            <div className="relative w-full group/topcard">
              <CelebCard
                id={entry.celeb.id}
                nickname={entry.celeb.nickname}
                avatar_url={entry.celeb.avatar_url}
                title={entry.celeb.title}
                celebProfile={entry.celeb}
                variant="card"
                shape="square"
                onSubtitle={handleSubtitle}
              />
              {/* 프리미엄 컨텐츠 카테고리 & 숫자 뱃지 (우측 상단 슬롯) */}
              {typeCount > 0 && (
                <div
                  className="absolute top-2.5 right-2.5 z-20 flex items-center pl-2.5 pr-3 py-1.5 rounded-full border border-white/20 shadow-2xl backdrop-blur-xl transition-all duration-500 group-hover/topcard:scale-105 group-hover/topcard:border-white/40"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.5) 100%)",
                  }}
                >
                  {/* 은은한 테마 컬러 글로우 */}
                  <div
                    className={`absolute inset-0 rounded-full opacity-30 ${config.badgeBg} blur-md`}
                  />
                  
                  <div className="relative flex items-center gap-1.5">
                    {Icon && (
                      <Icon
                        size={12}
                        className={`${config.color} shrink-0`}
                        strokeWidth={2.5}
                      />
                    )}
                    <span className="text-[10px] sm:text-xs font-black text-white/95 uppercase tracking-wider drop-shadow-sm">
                      {label}
                    </span>
                    <div className="w-px h-3 bg-white/30 mx-0.5 rounded-full" />
                    <span
                      className={`text-xs sm:text-sm font-black ${config.color} tabular-nums leading-none tracking-tight drop-shadow-md`}
                    >
                      {typeCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
