/*
  파일명: /components/features/user/explore/hub/TopByTypeGrid.tsx
  기능: 분야별 최다 기록가 그리드
  책임: 분야당 상위 3명(책→영화→게임→음악 순)을 다른 탭과 동일한 단일 격자로 배치.
        분야 구분은 카드 우상단 색 뱃지(아이콘·기록 수)가 맡는다.
*/ // ------------------------------

"use client";

import CelebCard from "@/components/shared/CelebCard";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import { BookOpen, Film, Gamepad2, Music } from "lucide-react";
import { useLocale } from "next-intl";
import type { TopByTypeEntry } from "@/actions/home/getTopByContentType";

/* 도서 아이콘은 공용 분류표(constants/categories.ts)와 같은 펼친 책을 쓴다 —
   닫힌 책은 이 크기(12px)에서 공책처럼 보인다. */
const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; badgeBg: string; badgeShadow: string }> = {
  BOOK: { icon: BookOpen, color: "text-blue-400", badgeBg: "bg-blue-500", badgeShadow: "shadow-blue-500/40" },
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
    /* HubCelebGrid와 같은 격자 규격 — 탭을 오가도 카드 크기·간격이 흔들리지 않게 한다 */
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
      {entries.flatMap((entry) => {
        const config = TYPE_CONFIG[entry.type];
        const Icon = config.icon;
        const label = locale === "en" ? entry.label.en : entry.label.ko;

        return entry.celebs.map((celeb) => {
          const typeCount = celeb.content_count ?? 0;
          return (
            <div key={`${entry.type}-${celeb.id}`} className="relative w-full group/topcard">
              <CelebCard
                id={celeb.id}
                nickname={celeb.nickname}
                avatar_url={celeb.avatar_url}
                title={celeb.title}
                celebProfile={celeb}
                variant="card"
                shape="square"
                onSubtitle={handleSubtitle}
              />
              {/* 프리미엄 컨텐츠 카테고리 & 숫자 뱃지 (우측 상단 슬롯) */}
              {typeCount > 0 && (
                <div
                  className="absolute top-2.5 right-2.5 z-20 flex items-center pl-2 pr-2.5 py-1.5 rounded-full border border-white/20 shadow-2xl backdrop-blur-xl transition-[transform,border-color] duration-500 group-hover/topcard:scale-105 group-hover/topcard:border-white/40"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.5) 100%)",
                  }}
                  title={`${label} ${typeCount}`}
                >
                  {/* 은은한 테마 컬러 글로우 */}
                  <div
                    className={`absolute inset-0 rounded-full opacity-30 ${config.badgeBg} blur-md`}
                  />

                  {/* 분야 이름은 적지 않는다 — 아이콘이 이미 분야를 말한다.
                      대신 읽어주는 도구를 위해 뱃지 전체에 분야명을 붙여 둔다. */}
                  <div className="relative flex items-center gap-1.5">
                    {Icon && (
                      <Icon
                        size={12}
                        className={`${config.color} shrink-0`}
                        strokeWidth={2.5}
                        aria-label={label}
                      />
                    )}
                    <span
                      className={`text-xs sm:text-sm font-black ${config.color} tabular-nums leading-none tracking-tight drop-shadow-md`}
                    >
                      {typeCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        });
      })}
    </div>
  );
}
